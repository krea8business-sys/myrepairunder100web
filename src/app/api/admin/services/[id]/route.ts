import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { adminRoute, ApiError } from "@/server/admin-api";
import { serviceInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>("MANAGER", async (req, admin, { params }) => {
  const { id } = await params;
  const body = (await readJson(req)) as Record<string, unknown>;
  const existing = (await db.select().from(schema.services).where(eq(schema.services.id, id)).limit(1))[0];
  if (!existing) throw new ApiError(404, "Service not found");
  // validate the merged record so partial updates (e.g. toggling active) keep invariants
  const merged = serviceInput.parse({ ...existing, ...body });
  const data = { ...merged, price: merged.priceType === "QUOTE" ? null : merged.price };
  await db.update(schema.services).set(data).where(eq(schema.services.id, id));
  const changed = Object.fromEntries(Object.keys(body).map((k) => [k, { from: existing[k as keyof typeof existing], to: data[k as keyof typeof data] }]));
  await audit(admin, "service.update", "service", id, changed);
  return ok({ ok: true });
});

/** Deletes a never-booked service; otherwise archives it so past bookings keep their reference. */
export const DELETE = adminRoute<Ctx>("MANAGER", async (_req, admin, { params }) => {
  const { id } = await params;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.bookingItems).where(eq(schema.bookingItems.serviceId, id));
  if (Number(n) > 0) {
    await db.update(schema.services).set({ archived: true, active: false }).where(eq(schema.services.id, id));
    await audit(admin, "service.archive", "service", id);
    return ok({ archived: true });
  }
  await db.delete(schema.services).where(eq(schema.services.id, id));
  await audit(admin, "service.delete", "service", id);
  return ok({ deleted: true });
});
