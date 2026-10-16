import { and, eq, sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, schema } from "@/db";
import type { CreateBookingInput } from "@/lib/validation";
import { BookingError, createBooking } from "@/server/bookings";
import { getAvailability } from "@/server/schedule";
import { loadSettings } from "@/server/settings";

const run = process.env.TEST_DATABASE_URL ? describe : describe.skip;

run("createBooking (database)", () => {
  let acService: { id: string; price: number | null };
  let fridgeInspection: { id: string; price: number | null };
  let slot: { id: string };
  let date: string;

  beforeAll(async () => {
    const svcs = await db.select().from(schema.services);
    acService = svcs.find((s) => s.slug === "ac-general-service")!;
    fridgeInspection = svcs.find((s) => s.slug === "refrigerator-inspection")!;
    const settings = await loadSettings();
    const days = await getAvailability(settings);
    const day = days.find((d) => !d.isToday && !d.closed && d.slots.some((s) => s.available))!;
    date = day.date;
    slot = day.slots.find((s) => s.available)!;
  });

  beforeEach(async () => {
    await db.execute(sql`TRUNCATE bookings CASCADE`);
    await db.update(schema.timeSlots).set({ capacity: 3 });
  });

  const input = (o: Partial<CreateBookingInput> = {}): CreateBookingInput => ({
    idempotencyKey: crypto.randomUUID(),
    customer: { name: "Test User", mobile: "9876543210" },
    address: { houseNo: "1", street: "Main Road", city: "Delhi", state: "Delhi", pincode: "110084", addressType: "HOME" },
    schedule: { date, slotId: slot.id, asap: false },
    items: [{ serviceId: acService.id, quantity: 2 }, { serviceId: fridgeInspection.id, quantity: 1 }],
    ...o,
  });

  it("creates a booking with a unique MRU code and server-calculated prices", async () => {
    const settings = await loadSettings();
    const { booking, replayed } = await createBooking(input(), settings);
    expect(replayed).toBe(false);
    expect(booking.code).toMatch(/^MRU-[A-HJ-NP-Z2-9]{8}$/);
    expect(booking.subtotal).toBe(acService.price! * 2 + fridgeInspection.price!);
    expect(booking.status).toBe("RECEIVED");
    const items = await db.select().from(schema.bookingItems).where(eq(schema.bookingItems.bookingId, booking.id));
    expect(items).toHaveLength(2);
    const events = await db.select().from(schema.bookingEvents).where(eq(schema.bookingEvents.bookingId, booking.id));
    expect(events[0].type).toBe("CREATED");
  });

  it("merges duplicate cart lines and clamps quantity to the configured max", async () => {
    const settings = await loadSettings();
    const { booking } = await createBooking(input({ items: [{ serviceId: acService.id, quantity: 4 }, { serviceId: acService.id, quantity: 4 }] }), settings);
    const items = await db.select().from(schema.bookingItems).where(eq(schema.bookingItems.bookingId, booking.id));
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBeLessThanOrEqual(6);
  });

  it("is idempotent: same key returns the same booking (double submit)", async () => {
    const settings = await loadSettings();
    const i = input();
    const [a, b] = await Promise.all([createBooking(i, settings), createBooking(i, settings)]);
    expect(a.booking.id).toBe(b.booking.id);
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.bookings);
    expect(Number(n)).toBe(1);
    const again = await createBooking(i, settings);
    expect(again.replayed).toBe(true);
  });

  it("rejects reuse of an idempotency key by a different mobile", async () => {
    const settings = await loadSettings();
    const i = input();
    await createBooking(i, settings);
    await expect(createBooking({ ...i, customer: { name: "X", mobile: "9123456789" } }, settings)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("rejects unserviceable pincodes", async () => {
    const settings = await loadSettings();
    await expect(createBooking(input({ address: { ...input().address, pincode: "400001" } }), settings)).rejects.toMatchObject({ code: "NOT_SERVICEABLE" });
  });

  it("rejects inactive or unknown services", async () => {
    const settings = await loadSettings();
    await db.update(schema.services).set({ active: false }).where(eq(schema.services.id, fridgeInspection.id));
    try {
      await expect(createBooking(input(), settings)).rejects.toMatchObject({ code: "SERVICES_UNAVAILABLE" });
      await expect(createBooking(input({ items: [{ serviceId: "nope", quantity: 1 }] }), settings)).rejects.toBeInstanceOf(BookingError);
    } finally {
      await db.update(schema.services).set({ active: true }).where(eq(schema.services.id, fridgeInspection.id));
    }
  });

  it("prevents overbooking under concurrent requests", async () => {
    const settings = await loadSettings();
    await db.update(schema.timeSlots).set({ capacity: 2 }).where(eq(schema.timeSlots.id, slot.id));
    const results = await Promise.allSettled(Array.from({ length: 6 }, (_, k) => createBooking(input({ customer: { name: "C", mobile: `98765432${10 + k}` } }), settings)));
    const ok = results.filter((r) => r.status === "fulfilled");
    const full = results.filter((r) => r.status === "rejected" && (r.reason as BookingError).code === "SLOT_UNAVAILABLE");
    expect(ok).toHaveLength(2);
    expect(full).toHaveLength(4);
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.bookings).where(and(eq(schema.bookings.slotId, slot.id), eq(schema.bookings.scheduledDate, date)));
    expect(Number(n)).toBe(2);
  });

  it("rejects closed days / past dates", async () => {
    const settings = await loadSettings();
    await expect(createBooking(input({ schedule: { date: "2020-01-01", slotId: slot.id, asap: false } }), settings)).rejects.toMatchObject({ code: "SLOT_UNAVAILABLE" });
  });
});
