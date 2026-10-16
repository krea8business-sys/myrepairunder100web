import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { trackSchema } from "@/lib/validation";
import { grantAccess } from "@/server/customer-access";
import { clientIp, fail, logError, ok, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

const GENERIC = "We couldn't find a booking with those details. Check the booking ID and the mobile number used when booking.";

/** Booking lookup requires BOTH booking ID and mobile. Rate limited; generic errors prevent enumeration. */
export async function POST(req: Request) {
  try {
    const ip = await clientIp();
    const rl = await rateLimit("track-ip", ip, 10, 900);
    if (!rl.allowed) return fail(429, "Too many lookups. Please wait a few minutes and try again.", { retryAfter: rl.retryAfterSec });

    const parsed = trackSchema.safeParse(await readJson(req, 2000));
    if (!parsed.success) return fail(422, parsed.error.issues[0].message);
    const { code, mobile } = parsed.data;

    const perCode = await rateLimit("track-code", code, 8, 3600);
    if (!perCode.allowed) return fail(429, "Too many lookups. Please wait and try again.");

    const rows = await db
      .select({ code: schema.bookings.code })
      .from(schema.bookings)
      .where(and(eq(schema.bookings.code, code), eq(schema.bookings.customerMobile, mobile)))
      .limit(1);
    if (!rows[0]) {
      await new Promise((r) => setTimeout(r, 250 + Math.random() * 250)); // blunt timing differences
      return fail(404, GENERIC);
    }
    await grantAccess(code);
    return ok({ code });
  } catch (e) {
    logError("track", e);
    return fail(500, "Something went wrong. Please try again.");
  }
}
