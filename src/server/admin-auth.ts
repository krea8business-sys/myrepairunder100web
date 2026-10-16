import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ADMIN_COOKIE, ADMIN_SESSION_HOURS, hasRole, signAdminToken, verifyAdminToken, type AdminRole } from "./admin-session";

export type CurrentAdmin = { id: string; name: string; email: string; role: AdminRole };

/** Verifies the cookie AND re-checks the admin in the database (deactivated admins lose access immediately). */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const jar = await cookies();
  const tok = await verifyAdminToken(jar.get(ADMIN_COOKIE)?.value);
  if (!tok) return null;
  const rows = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.id, tok.sub)).limit(1);
  const a = rows[0];
  if (!a || !a.active) return null;
  return { id: a.id, name: a.name, email: a.email, role: a.role };
}

export class AuthError extends Error {
  constructor(public status: 401 | 403) {
    super(status === 401 ? "Not signed in" : "You don't have permission to do that");
  }
}

/** For API routes: throws AuthError. */
export async function requireAdminApi(role: AdminRole = "STAFF"): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) throw new AuthError(401);
  if (!hasRole(admin.role, role)) throw new AuthError(403);
  return admin;
}

/** For admin pages: redirects. */
export async function requireAdminPage(role: AdminRole = "STAFF"): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!hasRole(admin.role, role)) redirect("/admin?denied=1");
  return admin;
}

export async function startAdminSession(a: { id: string; name: string; role: AdminRole }) {
  const token = await signAdminToken({ sub: a.id, name: a.name, role: a.role });
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
}

export async function endAdminSession() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}
