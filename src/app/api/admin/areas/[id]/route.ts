import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { slugify } from "@/lib/format";
import { adminRoute } from "@/server/admin-api";
import { areaInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>("MANAGER", async (req, admin, { params }) => {
  const { id } = await params;
  const { categoryIds, ...data } = areaInput.partial().parse(await readJson(req));
  await db.transaction(async (tx) => {
    if (Object.keys(data).length) await tx.update(schema.serviceAreas).set({ ...data, ...(data.locality ? { slug: slugify(data.locality) } : {}) }).where(eq(schema.serviceAreas.id, id));
    if (categoryIds) {
      await tx.delete(schema.areaCategories).where(eq(schema.areaCategories.areaId, id));
      if (categoryIds.length) await tx.insert(schema.areaCategories).values(categoryIds.map((categoryId) => ({ areaId: id, categoryId })));
    }
  });
  await audit(admin, "area.update", "area", id, { ...data, categoryIds });
  return ok({ ok: true });
});

export const DELETE = adminRoute<Ctx>("MANAGER", async (_req, admin, { params }) => {
  const { id } = await params;
  await db.delete(schema.serviceAreas).where(eq(schema.serviceAreas.id, id));
  await audit(admin, "area.delete", "area", id);
  return ok({ ok: true });
});
