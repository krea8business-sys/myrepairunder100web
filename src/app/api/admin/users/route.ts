import bcrypt from "bcryptjs";
import { db, schema } from "@/db";
import { adminRoute, ApiError } from "@/server/admin-api";
import { adminUserInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

export const POST = adminRoute("OWNER", async (req, admin) => {
  const data = adminUserInput.parse(await readJson(req));
  if (!data.password) throw new ApiError(422, "Set an initial password (12+ characters).");
  const [u] = await db
    .insert(schema.adminUsers)
    .values({ email: data.email, name: data.name, role: data.role, active: data.active, passwordHash: await bcrypt.hash(data.password, 12) })
    .returning();
  await audit(admin, "admin.create", "admin", u.id, { email: u.email, role: u.role });
  return ok({ id: u.id }, { status: 201 });
});
