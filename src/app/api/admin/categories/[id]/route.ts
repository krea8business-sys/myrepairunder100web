import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { adminRoute, ApiError } from "@/server/admin-api";
import { categoryInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>("MANAGER", async (req, admin, { params }) => {
  const { id } = await params;
  const data = categoryInput.partial().parse(await readJson(req));
  const [c] = await db.update(schema.categories).set(data).where(eq(schema.categories.id, id)).returning();
  if (!c) throw new ApiError(404, "Category not found");
  await audit(admin, "category.update", "category", id, data);
  return ok({ ok: true });
});

/** Deletes an empty category; otherwise archives it (keeps booking history intact). */
export const DELETE = adminRoute<Ctx>("MANAGER", async (_req, admin, { params }) => {
  const { id } = await params;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.services).where(eq(schema.services.categoryId, id));
  if (Number(n) > 0) {
    await db.update(schema.categories).set({ archived: true, active: false }).where(eq(schema.categories.id, id));
    await audit(admin, "category.archive", "category", id);
    return ok({ archived: true });
  }
  await db.delete(schema.categories).where(eq(schema.categories.id, id));
  await audit(admin, "category.delete", "category", id);
  return ok({ deleted: true });
});
