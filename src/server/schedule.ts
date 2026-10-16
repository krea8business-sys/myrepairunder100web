import "server-only";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, schema, type DB } from "@/db";
import type { Settings } from "@/db/schema";
import { computeAvailability, type BookingCounts, type DayAvailability } from "@/lib/slots";
import { CAPACITY_STATUSES } from "@/lib/status";
import { addDays, nowIST } from "@/lib/time";
import { scheduleSettings } from "./settings";

type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

/** Availability for the booking window, from admin configuration and live booking counts. */
export async function getAvailability(settings: Settings, conn: DB | Tx = db, now = new Date()): Promise<DayAvailability[]> {
  const start = nowIST(now).date;
  const end = addDays(start, Math.max(0, settings.bookingWindowDays - 1));
  const [slots, blocks, countRows] = await Promise.all([
    conn.select().from(schema.timeSlots).orderBy(asc(schema.timeSlots.sortOrder)),
    conn
      .select()
      .from(schema.blockedPeriods)
      .where(and(gte(schema.blockedPeriods.date, start), lte(schema.blockedPeriods.date, end))),
    conn
      .select({
        date: schema.bookings.scheduledDate,
        slotId: schema.bookings.slotId,
        isAsap: schema.bookings.isAsap,
        n: sql<number>`count(*)::int`,
      })
      .from(schema.bookings)
      .where(
        and(
          gte(schema.bookings.scheduledDate, start),
          lte(schema.bookings.scheduledDate, end),
          inArray(schema.bookings.status, CAPACITY_STATUSES),
        ),
      )
      .groupBy(schema.bookings.scheduledDate, schema.bookings.slotId, schema.bookings.isAsap),
  ]);
  const counts: BookingCounts = {};
  for (const r of countRows) {
    const key = r.isAsap ? `${r.date}|ASAP` : `${r.date}|${r.slotId}`;
    counts[key] = (counts[key] ?? 0) + Number(r.n);
  }
  return computeAvailability(scheduleSettings(settings), slots, blocks, counts, now);
}

export async function getSlotById(id: string, conn: DB | Tx = db) {
  const r = await conn.select().from(schema.timeSlots).where(eq(schema.timeSlots.id, id)).limit(1);
  return r[0] ?? null;
}
