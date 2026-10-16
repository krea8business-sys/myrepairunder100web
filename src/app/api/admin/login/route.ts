import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { startAdminSession } from "@/server/admin-auth";
import { audit } from "@/server/audit";
import { clientIp, fail, logError, ok, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

const schemaIn = z.object({ email: z.string().trim().toLowerCase().email().max(120), password: z.string().min(1).max(200) });
// Constant-time-ish dummy hash so unknown emails take as long as wrong passwords.
const DUMMY = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5V0O8fPj6xk7QH0Ii0B0pQ1a6WQq7qK";

export async function POST(req: Request) {
  try {
    const ip = await clientIp();
    const rl = await rateLimit("admin-login", ip, 8, 900);
    if (!rl.allowed) return fail(429, "Too many sign-in attempts. Try again in a few minutes.");
    const parsed = schemaIn.safeParse(await readJson(req, 2000));
    if (!parsed.success) return fail(422, "Enter your email and password.");
    const perEmail = await rateLimit("admin-login-email", parsed.data.email, 10, 3600);
    if (!perEmail.allowed) return fail(429, "Too many sign-in attempts. Try again later.");

    const rows = await db.select().from(schema.adminUsers).where(eq(schema.adminUsers.email, parsed.data.email)).limit(1);
    const admin = rows[0];
    const okPw = await bcrypt.compare(parsed.data.password, admin?.passwordHash ?? DUMMY);
    if (!admin || !okPw || !admin.active) return fail(401, "Incorrect email or password.");

    await db.update(schema.adminUsers).set({ lastLoginAt: new Date() }).where(eq(schema.adminUsers.id, admin.id));
    await startAdminSession({ id: admin.id, name: admin.name, role: admin.role });
    await audit({ id: admin.id, name: admin.name, email: admin.email, role: admin.role }, "admin.login", "admin", admin.id);
    return ok({ ok: true });
  } catch (e) {
    logError("admin login", e);
    return fail(500, "Sign-in failed. Please try again.");
  }
}
