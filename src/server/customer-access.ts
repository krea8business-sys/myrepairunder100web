import "server-only";
import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { sessionKey } from "./secrets";

/**
 * Customers have no accounts. After creating a booking — or proving booking ID + mobile on the
 * track page — we set an httpOnly signed cookie listing the booking codes this browser may view.
 */
const COOKIE = "mru_access";
const MAX_CODES = 10;
const TTL_DAYS = 30;

export async function getAccessibleCodes(): Promise<string[]> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { audience: "customer" });
    return Array.isArray(payload.codes) ? (payload.codes as string[]).filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export async function grantAccess(code: string): Promise<void> {
  const existing = await getAccessibleCodes();
  const codes = [code, ...existing.filter((c) => c !== code)].slice(0, MAX_CODES);
  const token = await new SignJWT({ codes })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience("customer")
    .setIssuedAt()
    .setExpirationTime(`${TTL_DAYS}d`)
    .sign(sessionKey());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_DAYS * 86400,
  });
}

export async function canAccess(code: string): Promise<boolean> {
  return (await getAccessibleCodes()).includes(code);
}
