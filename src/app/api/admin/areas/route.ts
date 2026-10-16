import { db, schema } from "@/db";
import { slugify } from "@/lib/format";
import { adminRoute } from "@/server/admin-api";
import { areaInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

export const POST = adminRoute("MANAGER", async (req, admin) => {
  const { categoryIds, ...data } = areaInput.parse(await readJson(req));
  const area = await db.transaction(async (tx) => {
    const [a] = await tx.insert(schema.serviceAreas).values({ ...data, slug: slugify(data.locality) }).returning();
    if (categoryIds.length) await tx.insert(schema.areaCategories).values(categoryIds.map((categoryId) => ({ areaId: a.id, categoryId })));
    return a;
  });
  await audit(admin, "area.create", "area", area.id, { locality: area.locality, pincode: area.pincode });
  return ok({ id: area.id }, { status: 201 });
});
