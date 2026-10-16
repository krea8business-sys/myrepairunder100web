import { db, schema } from "@/db";
import { adminRoute } from "@/server/admin-api";
import { categoryInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

export const POST = adminRoute("MANAGER", async (req, admin) => {
  const data = categoryInput.parse(await readJson(req));
  const [c] = await db.insert(schema.categories).values(data).returning();
  await audit(admin, "category.create", "category", c.id, { name: c.name });
  return ok({ id: c.id }, { status: 201 });
});
