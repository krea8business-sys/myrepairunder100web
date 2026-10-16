/** Admin session token helpers — Edge-safe (used by middleware) and Node. */
import { jwtVerify, SignJWT } from "jose";
import { sessionKey } from "./secrets";

export const ADMIN_COOKIE = "mru_admin";
export const ADMIN_SESSION_HOURS = 12;

export type AdminRole = "OWNER" | "MANAGER" | "STAFF";
export type AdminToken = { sub: string; role: AdminRole; name: string };

export async function signAdminToken(t: AdminToken): Promise<string> {
  return new SignJWT({ role: t.role, name: t.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(t.sub)
    .setAudience("admin")
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_HOURS}h`)
    .sign(sessionKey());
}

export async function verifyAdminToken(token: string | undefined): Promise<AdminToken | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { audience: "admin" });
    if (!payload.sub || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role as AdminRole, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}

const RANK: Record<AdminRole, number> = { STAFF: 1, MANAGER: 2, OWNER: 3 };
export function hasRole(actual: AdminRole, required: AdminRole): boolean {
  return RANK[actual] >= RANK[required];
}
