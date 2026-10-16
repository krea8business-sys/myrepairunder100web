import { db, schema } from "@/db";
import { adminRoute } from "@/server/admin-api";
import { blockInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

export const POST = adminRoute("MANAGER", async (req, admin) => {
  const data = blockInput.parse(await readJson(req));
  const [b] = await db.insert(schema.blockedPeriods).values(data).returning();
  await audit(admin, "block.create", "schedule", b.id, data);
  return ok({ id: b.id }, { status: 201 });
});
