import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import type { Booking } from "@/db/schema";
import { isSlotBookable } from "@/lib/slots";
import { BOOKING_STATUSES, canTransition, STATUS_META, type Status } from "@/lib/status";
import { isValidISODate } from "@/lib/time";
import type { CurrentAdmin } from "./admin-auth";
import { ApiError } from "./admin-api";
import { audit } from "./audit";
import { getAvailability } from "./schedule";

const money = z.number().int().min(0).max(10_000_000).nullable();

export const bookingActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), to: z.enum(BOOKING_STATUSES), reason: z.string().trim().max(300).optional(), notifyCustomer: z.boolean().optional() }),
  z.object({ action: z.literal("assign"), technicianId: z.string().max(64).nullable() }),
  z.object({ action: z.literal("note"), text: z.string().trim().min(1).max(2000) }),
  z.object({
    action: z.literal("reschedule"),
    date: z.string().refine(isValidISODate, "Invalid date"),
    slotId: z.string().max(64).nullable(),
    asap: z.boolean().default(false),
    override: z.boolean().default(false),
  }),
  z.object({ action: z.literal("charges"), serviceCharges: money, partsCharges: money, extraCharges: money }),
  z.object({
    action: z.literal("payment"),
    paymentStatus: z.enum(["NOT_RECORDED", "PENDING", "PAID_CASH", "PAID_UPI", "PAID_ONLINE", "PARTIALLY_PAID", "WAIVED", "REFUNDED"]),
    paymentMethod: z.string().trim().max(60).nullable().optional(),
    paymentReference: z.string().trim().max(120).nullable().optional(),
  }),
  z.object({ action: z.literal("cancel-request"), decision: z.enum(["approve", "decline"]), reason: z.string().trim().max(300).optional() }),
]);
export type BookingAction = z.infer<typeof bookingActionSchema>;

/** Applies an admin action in a transaction and writes the audit trail. Returns updated booking + whether customer-visible status changed. */
export async function applyBookingAction(id: string, action: BookingAction, admin: CurrentAdmin): Promise<{ booking: Booking; statusChanged: boolean }> {
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, id)).for("update").limit(1);
    const b = rows[0];
    if (!b) throw new ApiError(404, "Booking not found");
    const ev = (e: Omit<typeof schema.bookingEvents.$inferInsert, "bookingId" | "actor" | "actorId">) =>
      tx.insert(schema.bookingEvents).values({ ...e, bookingId: id, actor: admin.name, actorId: admin.id });

    const setStatus = async (to: Status, message: string, extra: Partial<Booking> = {}) => {
      if (!canTransition(b.status, to)) throw new ApiError(409, `Can't change status from “${STATUS_META[b.status].label}” to “${STATUS_META[to].label}”.`);
      const [u] = await tx.update(schema.bookings).set({ status: to, ...extra }).where(eq(schema.bookings.id, id)).returning();
      await ev({ type: "STATUS_CHANGE", fromStatus: b.status, toStatus: to, message, internal: false });
      return u;
    };

    switch (action.action) {
      case "status": {
        if (action.to === "TECHNICIAN_ASSIGNED" && !b.technicianId) throw new ApiError(409, "Assign a technician first.");
        const extra: Partial<Booking> = {};
        if (action.to === "CANCELLED") {
          extra.cancelledReason = action.reason || "Cancelled by the business";
          extra.cancelRequested = false;
        }
        const u = await setStatus(action.to, action.to === "CANCELLED" ? `Cancelled: ${extra.cancelledReason}` : STATUS_META[action.to].label, extra);
        await audit(admin, "booking.status", "booking", id, { from: b.status, to: action.to });
        return { booking: u, statusChanged: true };
      }
      case "assign": {
        if (b.status === "COMPLETED" || b.status === "CANCELLED") throw new ApiError(409, "Can't change technician on a closed booking.");
        let techName: string | null = null;
        if (action.technicianId) {
          const t = await tx.select().from(schema.technicians).where(eq(schema.technicians.id, action.technicianId)).limit(1);
          if (!t[0] || !t[0].active) throw new ApiError(422, "Technician not found or inactive.");
          techName = t[0].name;
        }
        await tx
          .update(schema.technicianAssignments)
          .set({ unassignedAt: new Date() })
          .where(and(eq(schema.technicianAssignments.bookingId, id), isNull(schema.technicianAssignments.unassignedAt)));
        if (action.technicianId) {
          await tx.insert(schema.technicianAssignments).values({ bookingId: id, technicianId: action.technicianId, assignedBy: admin.name });
        }
        let [u] = await tx.update(schema.bookings).set({ technicianId: action.technicianId }).where(eq(schema.bookings.id, id)).returning();
        await ev({ type: "ASSIGNMENT", message: techName ? `Assigned to ${techName}` : "Technician unassigned", internal: true });
        let statusChanged = false;
        // Assigning on a confirmed booking advances the customer-visible status.
        if (action.technicianId && b.status === "CONFIRMED") {
          [u] = await tx.update(schema.bookings).set({ status: "TECHNICIAN_ASSIGNED" }).where(eq(schema.bookings.id, id)).returning();
          await ev({ type: "STATUS_CHANGE", fromStatus: "CONFIRMED", toStatus: "TECHNICIAN_ASSIGNED", message: "Technician assigned", internal: false });
          statusChanged = true;
        }
        if (!action.technicianId && b.status === "TECHNICIAN_ASSIGNED") {
          [u] = await tx.update(schema.bookings).set({ status: "CONFIRMED" }).where(eq(schema.bookings.id, id)).returning();
          await ev({ type: "STATUS_CHANGE", fromStatus: "TECHNICIAN_ASSIGNED", toStatus: "CONFIRMED", message: "Confirmed — technician to be assigned", internal: false });
          statusChanged = true;
        }
        await audit(admin, "booking.assign", "booking", id, { technicianId: action.technicianId });
        return { booking: u, statusChanged };
      }
      case "note": {
        await ev({ type: "NOTE", message: action.text, internal: true });
        return { booking: b, statusChanged: false };
      }
      case "reschedule": {
        if (b.status === "COMPLETED" || b.status === "CANCELLED") throw new ApiError(409, "Can't reschedule a closed booking.");
        if (!action.asap && !action.slotId) throw new ApiError(422, "Choose a slot.");
        await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"mru-slot:" + action.date}))`);
        const settings = (await tx.select().from(schema.businessSettings).limit(1))[0];
        const slot = action.slotId ? (await tx.select().from(schema.timeSlots).where(eq(schema.timeSlots.id, action.slotId)).limit(1))[0] : null;
        if (action.slotId && !slot) throw new ApiError(422, "Slot not found.");
        if (!action.override) {
          // exclude this booking's own seat when checking capacity
          const days = await getAvailability(settings, tx);
          const same = b.scheduledDate === action.date && (action.asap ? b.isAsap : b.slotId === action.slotId);
          if (!same && !isSlotBookable(days, action.date, action.slotId, action.asap)) {
            throw new ApiError(409, "That slot is full, blocked or outside the booking window. Tick “override capacity” to force it.", { needsOverride: true });
          }
        }
        const label = action.asap ? "ASAP — earliest available" : slot!.label;
        const [u] = await tx
          .update(schema.bookings)
          .set({ scheduledDate: action.date, slotId: action.asap ? null : action.slotId, slotLabel: label, isAsap: action.asap })
          .where(eq(schema.bookings.id, id))
          .returning();
        await ev({ type: "RESCHEDULE", message: `Appointment changed to ${action.date}, ${label}`, internal: false });
        await audit(admin, "booking.reschedule", "booking", id, { from: `${b.scheduledDate} ${b.slotLabel}`, to: `${action.date} ${label}`, override: action.override });
        return { booking: u, statusChanged: false };
      }
      case "charges": {
        const parts = [action.serviceCharges, action.partsCharges, action.extraCharges];
        const finalAmount = parts.every((p) => p == null) ? null : parts.reduce<number>((s, p) => s + (p ?? 0), 0);
        const [u] = await tx
          .update(schema.bookings)
          .set({ serviceCharges: action.serviceCharges, partsCharges: action.partsCharges, extraCharges: action.extraCharges, finalAmount })
          .where(eq(schema.bookings.id, id))
          .returning();
        await ev({ type: "CHARGES", message: `Charges recorded: service ₹${action.serviceCharges ?? 0}, parts ₹${action.partsCharges ?? 0}, extra ₹${action.extraCharges ?? 0} (final ₹${finalAmount ?? 0})`, internal: true });
        await audit(admin, "booking.charges", "booking", id, { serviceCharges: action.serviceCharges, partsCharges: action.partsCharges, extraCharges: action.extraCharges });
        return { booking: u, statusChanged: false };
      }
      case "payment": {
        const [u] = await tx
          .update(schema.bookings)
          .set({ paymentStatus: action.paymentStatus, paymentMethod: action.paymentMethod ?? null, paymentReference: action.paymentReference ?? null })
          .where(eq(schema.bookings.id, id))
          .returning();
        await ev({ type: "PAYMENT", message: `Payment status recorded manually: ${action.paymentStatus}${action.paymentMethod ? ` via ${action.paymentMethod}` : ""}`, internal: true });
        await audit(admin, "booking.payment", "booking", id, { paymentStatus: action.paymentStatus });
        return { booking: u, statusChanged: false };
      }
      case "cancel-request": {
        if (!b.cancelRequested) throw new ApiError(409, "There's no pending cancellation request.");
        if (action.decision === "approve") {
          const u = await setStatus("CANCELLED", "Cancellation request approved", { cancelRequested: false, cancelledReason: action.reason || "Cancelled at customer's request" });
          await audit(admin, "booking.cancel-approve", "booking", id);
          return { booking: u, statusChanged: true };
        }
        const [u] = await tx.update(schema.bookings).set({ cancelRequested: false }).where(eq(schema.bookings.id, id)).returning();
        await ev({ type: "CANCEL_REQUEST", message: `Cancellation request declined${action.reason ? `: ${action.reason}` : ""}`, internal: false });
        await audit(admin, "booking.cancel-decline", "booking", id);
        return { booking: u, statusChanged: false };
      }
    }
  });
}
