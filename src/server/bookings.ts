import "server-only";
import { randomInt } from "node:crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Booking, Settings } from "@/db/schema";
import { calculateQuote, type PricedService } from "@/lib/pricing";
import { isSlotBookable } from "@/lib/slots";
import { isFinal, STATUS_META, type Status } from "@/lib/status";
import { istToDate } from "@/lib/time";
import type { CreateBookingInput } from "@/lib/validation";
import { checkServiceability } from "./areas";
import { logError } from "./http";
import { notifyBooking } from "./integrations/notify";
import type { BookingNotice } from "./integrations/types";
import { getAvailability } from "./schedule";
import { pricingSettings } from "./settings";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function generateBookingCode(): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return `MRU-${s}`;
}

export class BookingError extends Error {
  constructor(
    public code:
      | "SERVICES_UNAVAILABLE"
      | "NOT_SERVICEABLE"
      | "SLOT_UNAVAILABLE"
      | "IDEMPOTENCY_CONFLICT"
      | "EMPTY_CART",
    message: string,
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export type CreateResult = { booking: Booking; replayed: boolean };

/**
 * Creates a booking atomically:
 *  - idempotent on `idempotencyKey` (safe to retry / double-click),
 *  - prices recalculated from trusted catalogue data,
 *  - pincode serviceability enforced,
 *  - slot capacity enforced under a per-date advisory lock (no overbooking).
 */
export async function createBooking(input: CreateBookingInput, settings: Settings): Promise<CreateResult> {
  const existing = await db.select().from(schema.bookings).where(eq(schema.bookings.idempotencyKey, input.idempotencyKey)).limit(1);
  if (existing[0]) return replay(existing[0], input);

  // merge duplicate cart lines
  const merged = new Map<string, number>();
  for (const it of input.items) merged.set(it.serviceId, (merged.get(it.serviceId) ?? 0) + it.quantity);
  if (merged.size === 0) throw new BookingError("EMPTY_CART", "Your cart is empty.");

  const ids = [...merged.keys()];
  const svcRows = await db
    .select({ s: schema.services, c: schema.categories })
    .from(schema.services)
    .innerJoin(schema.categories, eq(schema.services.categoryId, schema.categories.id))
    .where(
      and(
        inArray(schema.services.id, ids),
        eq(schema.services.active, true),
        eq(schema.services.archived, false),
        eq(schema.categories.active, true),
        eq(schema.categories.archived, false),
      ),
    );
  const found = new Map<string, PricedService>(
    svcRows.map(({ s, c }) => [
      s.id,
      {
        id: s.id,
        name: s.name,
        categoryId: c.id,
        categoryName: c.name,
        priceType: s.priceType,
        price: s.price,
        partsExtra: s.partsExtra,
        requiresDiagnosis: s.requiresDiagnosis,
        allowQuantity: s.allowQuantity,
        maxQuantity: s.maxQuantity,
        priceIsDemo: s.priceIsDemo,
      },
    ]),
  );
  const missing = ids.filter((i) => !found.has(i));
  if (missing.length) {
    throw new BookingError("SERVICES_UNAVAILABLE", "Some services in your cart are no longer available. Please review your cart.", {
      unavailableServiceIds: missing,
    });
  }

  const quote = calculateQuote(
    ids.map((id) => ({ service: found.get(id)!, quantity: merged.get(id)! })),
    pricingSettings(settings),
  );

  const area = await checkServiceability(input.address.pincode, [...new Set(quote.lines.map((l) => l.categoryId))]);
  if (!area.serviceable) {
    throw new BookingError("NOT_SERVICEABLE", area.message, { unsupportedCategoryIds: area.unsupportedCategoryIds });
  }

  const { date, slotId, asap } = input.schedule;

  try {
    const { booking, created } = await db.transaction(async (tx) => {
      // Serialize bookings for the same date so capacity checks can't race.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"mru-slot:" + date}))`);

      // Re-check idempotency inside the lock (concurrent double-submit).
      const dupe = await tx.select().from(schema.bookings).where(eq(schema.bookings.idempotencyKey, input.idempotencyKey)).limit(1);
      if (dupe[0]) return { booking: dupe[0], created: false };

      const days = await getAvailability(settings, tx);
      if (!isSlotBookable(days, date, slotId ?? null, asap)) {
        throw new BookingError("SLOT_UNAVAILABLE", "Sorry, that time slot is no longer available. Please choose another slot.");
      }
      const slot = asap ? null : days.find((d) => d.date === date)?.slots.find((s) => s.id === slotId) ?? null;
      const slotLabel = asap ? "ASAP — earliest available" : slot!.label;

      let code = generateBookingCode();
      for (let i = 0; i < 5; i++) {
        const clash = await tx.select({ id: schema.bookings.id }).from(schema.bookings).where(eq(schema.bookings.code, code)).limit(1);
        if (!clash[0]) break;
        code = generateBookingCode();
      }

      const [b] = await tx
        .insert(schema.bookings)
        .values({
          code,
          idempotencyKey: input.idempotencyKey,
          status: "RECEIVED",
          customerName: input.customer.name,
          customerMobile: input.customer.mobile,
          customerEmail: input.customer.email ?? null,
          houseNo: input.address.houseNo,
          street: input.address.street,
          landmark: input.address.landmark ?? null,
          city: input.address.city,
          state: input.address.state,
          pincode: input.address.pincode,
          addressType: input.address.addressType,
          instructions: input.address.instructions ?? null,
          latitude: input.address.latitude ?? null,
          longitude: input.address.longitude ?? null,
          areaLocality: area.locality,
          scheduledDate: date,
          slotId: asap ? null : slotId!,
          slotLabel,
          isAsap: asap,
          subtotal: quote.subtotal,
          visitFee: quote.visitFee,
          taxAmount: quote.taxAmount,
          estimatedTotal: quote.total,
          hasUnpricedItems: quote.hasUnpricedItems,
          customerNote: input.note ?? null,
        })
        .returning();

      await tx.insert(schema.bookingItems).values(
        quote.lines.map((l) => ({
          bookingId: b.id,
          serviceId: l.serviceId,
          categoryId: l.categoryId,
          categoryName: l.categoryName,
          serviceName: l.name,
          priceType: l.priceType,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.lineTotal,
          partsExtra: l.partsExtra,
        })),
      );
      await tx.insert(schema.bookingEvents).values({
        bookingId: b.id,
        type: "CREATED",
        toStatus: "RECEIVED",
        message: "Booking request received",
        internal: false,
        actor: "customer",
      });
      return { booking: b, created: true };
    });

    if (!created) return replay(booking, input);
    return { booking, replayed: false };
  } catch (e) {
    // Unique violation on idempotency key from a concurrent request → return the winner.
    if ((e as { code?: string }).code === "23505") {
      const again = await db.select().from(schema.bookings).where(eq(schema.bookings.idempotencyKey, input.idempotencyKey)).limit(1);
      if (again[0]) return replay(again[0], input);
    }
    throw e;
  }
}

function replay(b: Booking, input: CreateBookingInput): CreateResult {
  if (b.customerMobile !== input.customer.mobile) {
    throw new BookingError("IDEMPOTENCY_CONFLICT", "This checkout session was already used. Please refresh and try again.");
  }
  return { booking: b, replayed: true };
}

export async function buildNotice(b: Booking, event: BookingNotice["event"]): Promise<BookingNotice> {
  const items = await db.select().from(schema.bookingItems).where(eq(schema.bookingItems.bookingId, b.id));
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return {
    event,
    code: b.code,
    status: b.status,
    statusLabel: STATUS_META[b.status].label,
    customerName: b.customerName,
    customerMobile: b.customerMobile,
    customerEmail: b.customerEmail,
    scheduledDate: b.scheduledDate,
    slotLabel: b.slotLabel,
    services: items.map((i) => ({ name: i.serviceName, quantity: i.quantity })),
    estimatedTotal: b.estimatedTotal,
    pincode: b.pincode,
    city: b.city,
    trackUrl: `${base}/track?code=${b.code}`,
  };
}

export async function safeNotify(b: Booking, event: BookingNotice["event"], settings: Settings) {
  try {
    const notice = await buildNotice(b, event);
    await Promise.race([notifyBooking(b.id, notice, settings), new Promise((r) => setTimeout(r, 8000))]);
  } catch (e) {
    logError("notify", e);
  }
}

// ---------------------------------------------------------------------------
// Customer-facing reads (never include internal notes or technician contact details)
// ---------------------------------------------------------------------------

export type PublicBooking = {
  code: string;
  status: Status;
  statusLabel: string;
  statusMessage: string;
  createdAt: string;
  customerName: string;
  mobileMasked: string;
  addressSummary: string;
  scheduledDate: string;
  slotLabel: string;
  isAsap: boolean;
  items: { name: string; category: string; quantity: number; unitPrice: number | null; lineTotal: number; priceType: string; partsExtra: boolean }[];
  subtotal: number;
  visitFee: number;
  taxAmount: number;
  estimatedTotal: number;
  hasUnpricedItems: boolean;
  finalAmount: number | null;
  paymentStatus: string;
  customerNote: string | null;
  technicianAssigned: boolean;
  technicianFirstName: string | null;
  cancelRequested: boolean;
  cancelledReason: string | null;
  canRequestCancel: boolean;
  timeline: { status: Status | null; message: string; at: string }[];
};

export async function getPublicBooking(code: string, settings: Settings): Promise<PublicBooking | null> {
  const rows = await db
    .select({ b: schema.bookings, techName: schema.technicians.name })
    .from(schema.bookings)
    .leftJoin(schema.technicians, eq(schema.bookings.technicianId, schema.technicians.id))
    .where(eq(schema.bookings.code, code))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const b = row.b;
  const [items, events] = await Promise.all([
    db.select().from(schema.bookingItems).where(eq(schema.bookingItems.bookingId, b.id)),
    db
      .select()
      .from(schema.bookingEvents)
      .where(and(eq(schema.bookingEvents.bookingId, b.id), eq(schema.bookingEvents.internal, false)))
      .orderBy(asc(schema.bookingEvents.createdAt)),
  ]);
  const mobile = b.customerMobile;
  return {
    code: b.code,
    status: b.status,
    statusLabel: STATUS_META[b.status].label,
    statusMessage: STATUS_META[b.status].customer,
    createdAt: b.createdAt.toISOString(),
    customerName: b.customerName,
    mobileMasked: `${mobile.slice(0, 2)}XXXXXX${mobile.slice(-2)}`,
    addressSummary: [b.houseNo, b.street, b.landmark, `${b.city} ${b.pincode}`].filter(Boolean).join(", "),
    scheduledDate: b.scheduledDate,
    slotLabel: b.slotLabel,
    isAsap: b.isAsap,
    items: items.map((i) => ({
      name: i.serviceName,
      category: i.categoryName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
      priceType: i.priceType,
      partsExtra: i.partsExtra,
    })),
    subtotal: b.subtotal,
    visitFee: b.visitFee,
    taxAmount: b.taxAmount,
    estimatedTotal: b.estimatedTotal,
    hasUnpricedItems: b.hasUnpricedItems,
    finalAmount: b.finalAmount,
    paymentStatus: b.paymentStatus,
    customerNote: b.customerNote,
    technicianAssigned: Boolean(b.technicianId),
    technicianFirstName: row.techName ? row.techName.split(" ")[0] : null,
    cancelRequested: b.cancelRequested,
    cancelledReason: b.status === "CANCELLED" ? b.cancelledReason : null,
    canRequestCancel: canRequestCancel(b, settings),
    timeline: events.map((e) => ({ status: e.toStatus, message: e.message ?? "", at: e.createdAt.toISOString() })),
  };
}

const CANCELLABLE: Status[] = ["RECEIVED", "PENDING_CONFIRMATION", "CONFIRMED", "TECHNICIAN_ASSIGNED"];

export function canRequestCancel(b: Pick<Booking, "status" | "cancelRequested" | "scheduledDate" | "slotLabel" | "isAsap" | "slotId">, settings: Settings, slotStart?: string, now = new Date()): boolean {
  if (!settings.allowCancellationRequest || b.cancelRequested || isFinal(b.status) || !CANCELLABLE.includes(b.status)) return false;
  // Cutoff relative to slot start (derive from label "9:00 AM – 11:00 AM" if start not given)
  const start = slotStart ?? labelStart(b.slotLabel) ?? "09:00";
  const startAt = istToDate(b.scheduledDate, b.isAsap ? "23:59" : start);
  return startAt.getTime() - now.getTime() > settings.cancellationCutoffHours * 3600_000;
}

function labelStart(label: string): string | null {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(label.trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

export async function requestCancellation(code: string, reason: string, settings: Settings): Promise<{ ok: boolean; message: string }> {
  const rows = await db.select().from(schema.bookings).where(eq(schema.bookings.code, code)).limit(1);
  const b = rows[0];
  if (!b) return { ok: false, message: "Booking not found." };
  if (!canRequestCancel(b, settings)) {
    return { ok: false, message: "This booking can no longer be cancelled online. Please contact support." };
  }
  await db.transaction(async (tx) => {
    await tx
      .update(schema.bookings)
      .set({ cancelRequested: true, cancelReason: reason, cancelRequestedAt: new Date() })
      .where(eq(schema.bookings.id, b.id));
    await tx.insert(schema.bookingEvents).values({
      bookingId: b.id,
      type: "CANCEL_REQUEST",
      message: "Cancellation requested by customer — awaiting review",
      internal: false,
      actor: "customer",
    });
  });
  await safeNotify({ ...b, cancelRequested: true }, "booking.cancel_requested", settings);
  return { ok: true, message: "Your cancellation request has been sent. We'll update the booking status once it's reviewed." };
}
