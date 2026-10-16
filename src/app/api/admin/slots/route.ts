import { db, schema } from "@/db";
import { adminRoute } from "@/server/admin-api";
import { slotInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

export const POST = adminRoute("MANAGER", async (req, admin) => {
  const data = slotInput.parse(await readJson(req));
  const [s] = await db.insert(schema.timeSlots).values(data).returning();
  await audit(admin, "slot.create", "slot", s.id, data);
  return ok({ id: s.id }, { status: 201 });
});
