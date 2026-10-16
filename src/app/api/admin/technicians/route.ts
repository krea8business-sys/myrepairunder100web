import { db, schema } from "@/db";
import { adminRoute } from "@/server/admin-api";
import { technicianInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

export const POST = adminRoute("MANAGER", async (req, admin) => {
  const { categoryIds, ...data } = technicianInput.parse(await readJson(req));
  const t = await db.transaction(async (tx) => {
    const [t] = await tx.insert(schema.technicians).values(data).returning();
    if (categoryIds.length) await tx.insert(schema.technicianSkills).values(categoryIds.map((categoryId) => ({ technicianId: t.id, categoryId })));
    return t;
  });
  await audit(admin, "technician.create", "technician", t.id, { name: t.name });
  return ok({ id: t.id }, { status: 201 });
});
