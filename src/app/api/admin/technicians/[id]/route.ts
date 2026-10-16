import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { adminRoute } from "@/server/admin-api";
import { technicianInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>("MANAGER", async (req, admin, { params }) => {
  const { id } = await params;
  const { categoryIds, ...data } = technicianInput.partial().parse(await readJson(req));
  await db.transaction(async (tx) => {
    if (Object.keys(data).length) await tx.update(schema.technicians).set(data).where(eq(schema.technicians.id, id));
    if (categoryIds) {
      await tx.delete(schema.technicianSkills).where(eq(schema.technicianSkills.technicianId, id));
      if (categoryIds.length) await tx.insert(schema.technicianSkills).values(categoryIds.map((categoryId) => ({ technicianId: id, categoryId })));
    }
  });
  await audit(admin, "technician.update", "technician", id, { ...data, categoryIds });
  return ok({ ok: true });
});
