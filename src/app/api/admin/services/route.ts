import { db, schema } from "@/db";
import { adminRoute } from "@/server/admin-api";
import { serviceInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

export const POST = adminRoute("MANAGER", async (req, admin) => {
  const data = serviceInput.parse(await readJson(req));
  const [s] = await db.insert(schema.services).values({ ...data, price: data.priceType === "QUOTE" ? null : data.price }).returning();
  await audit(admin, "service.create", "service", s.id, { name: s.name, price: s.price });
  return ok({ id: s.id }, { status: 201 });
});
