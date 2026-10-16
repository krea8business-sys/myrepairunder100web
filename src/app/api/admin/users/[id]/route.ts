import bcrypt from "bcryptjs";
import { and, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { adminRoute, ApiError } from "@/server/admin-api";
import { adminUserInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>("OWNER", async (req, admin, { params }) => {
  const { id } = await params;
  const data = adminUserInput.partial().parse(await readJson(req));
  if (id === admin.id && (data.active === false || (data.role && data.role !== "OWNER"))) throw new ApiError(409, "You can't deactivate or demote your own account.");
  if (data.active === false || (data.role && data.role !== "OWNER")) {
    const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.adminUsers).where(and(eq(schema.adminUsers.role, "OWNER"), eq(schema.adminUsers.active, true), ne(schema.adminUsers.id, id)));
    if (Number(n) === 0) throw new ApiError(409, "At least one active owner is required.");
  }
  const { password, ...rest } = data;
  await db.update(schema.adminUsers).set({ ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}) }).where(eq(schema.adminUsers.id, id));
  await audit(admin, "admin.update", "admin", id, { ...rest, passwordChanged: Boolean(password) });
  return ok({ ok: true });
});
