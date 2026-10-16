import "server-only";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { BOOKING_STATUSES, type Status } from "@/lib/status";

export type BookingFilters = {
  q?: string;
  status?: string;
  categoryId?: string;
  pincode?: string;
  from?: string;
  to?: string;
  cancelRequested?: boolean;
  page?: number;
};

export function parseFilters(sp: Record<string, string | string[] | undefined>): BookingFilters {
  const g = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : undefined) || undefined;
  return {
    q: g("q")?.slice(0, 80),
    status: g("status"),
    categoryId: g("category"),
    pincode: g("pincode")?.slice(0, 6),
    from: g("from"),
    to: g("to"),
    cancelRequested: g("cancel") === "1",
    page: Math.max(1, Number(g("page")) || 1),
  };
}

function where(f: BookingFilters): SQL | undefined {
  const c: SQL[] = [];
  if (f.q) {
    const q = `%${f.q.replace(/[%_]/g, "")}%`;
    const digits = f.q.replace(/\D/g, "");
    c.push(
      or(
        ilike(schema.bookings.code, q),
        ilike(schema.bookings.customerName, q),
        ilike(schema.bookings.areaLocality, q),
        ilike(schema.bookings.street, q),
        ...(digits.length >= 4 ? [ilike(schema.bookings.customerMobile, `%${digits.slice(-10)}%`)] : []),
      )!,
    );
  }
  if (f.status && (BOOKING_STATUSES as readonly string[]).includes(f.status)) c.push(eq(schema.bookings.status, f.status as Status));
  if (f.status === "OPEN") c.push(inArray(schema.bookings.status, ["RECEIVED", "PENDING_CONFIRMATION"]));
  if (f.pincode) c.push(eq(schema.bookings.pincode, f.pincode));
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) c.push(gte(schema.bookings.scheduledDate, f.from));
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) c.push(lte(schema.bookings.scheduledDate, f.to));
  if (f.cancelRequested) c.push(eq(schema.bookings.cancelRequested, true));
  if (f.categoryId) c.push(sql`exists (select 1 from booking_items bi where bi.booking_id = ${schema.bookings.id} and bi.category_id = ${f.categoryId})`);
  return c.length ? and(...c) : undefined;
}

export const PAGE_SIZE = 25;

export async function listBookings(f: BookingFilters, opts: { all?: boolean } = {}) {
  const w = where(f);
  const base = db
    .select({
      b: schema.bookings,
      tech: schema.technicians.name,
      services: sql<string>`(select string_agg(bi.service_name || case when bi.quantity > 1 then ' ×' || bi.quantity else '' end, ', ') from booking_items bi where bi.booking_id = ${schema.bookings.id})`,
    })
    .from(schema.bookings)
    .leftJoin(schema.technicians, eq(schema.bookings.technicianId, schema.technicians.id))
    .where(w)
    .orderBy(desc(schema.bookings.createdAt));
  const rows = opts.all ? await base.limit(10_000) : await base.limit(PAGE_SIZE).offset(((f.page ?? 1) - 1) * PAGE_SIZE);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.bookings).where(w);
  return { rows, total: Number(n) };
}

export async function bookingStats() {
  const rows = await db.select({ status: schema.bookings.status, n: sql<number>`count(*)::int` }).from(schema.bookings).groupBy(schema.bookings.status);
  const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)])) as Record<string, number>;
  const total = rows.reduce((s, r) => s + Number(r.n), 0);
  const [today] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.bookings).where(sql`${schema.bookings.createdAt} > now() - interval '24 hours'`);
  const [cancelReq] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.bookings).where(eq(schema.bookings.cancelRequested, true));
  return { total, by, newLast24h: Number(today.n), cancelRequests: Number(cancelReq.n) };
}
