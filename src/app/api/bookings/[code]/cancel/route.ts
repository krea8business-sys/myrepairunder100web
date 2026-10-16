import { cancelRequestSchema } from "@/lib/validation";
import { requestCancellation } from "@/server/bookings";
import { canAccess } from "@/server/customer-access";
import { clientIp, fail, logError, ok, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { getSettings } from "@/server/settings";

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    if (!(await canAccess(code))) return fail(403, "Please look up your booking with your booking ID and mobile number first.");
    const rl = await rateLimit("cancel", await clientIp(), 5, 3600);
    if (!rl.allowed) return fail(429, "Too many requests. Please contact support.");
    const parsed = cancelRequestSchema.safeParse(await readJson(req, 2000));
    if (!parsed.success) return fail(422, parsed.error.issues[0].message);
    const r = await requestCancellation(code, parsed.data.reason, await getSettings());
    return r.ok ? ok(r) : fail(409, r.message);
  } catch (e) {
    logError("cancel request", e);
    return fail(500, "Something went wrong. Please try again.");
  }
}
