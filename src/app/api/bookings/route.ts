import { after } from "next/server";
import { createBookingSchema } from "@/lib/validation";
import { BookingError, createBooking, safeNotify } from "@/server/bookings";
import { grantAccess } from "@/server/customer-access";
import { clientIp, fail, logError, ok, readJson, validationFail } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";
import { getSettings } from "@/server/settings";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await readJson(req, 16_000);
  } catch {
    return fail(400, "Invalid request.");
  }
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) return validationFail(parsed.error);
  if (parsed.data.website) return fail(400, "Invalid request."); // honeypot

  const ip = await clientIp();
  const [byIp, byMobile] = await Promise.all([
    rateLimit("book-ip", ip, 10, 3600),
    rateLimit("book-mobile", parsed.data.customer.mobile, 6, 3600),
  ]);
  if (!byIp.allowed || !byMobile.allowed) {
    return fail(429, "Too many booking attempts. Please wait a while or contact support.", { retryAfter: Math.max(byIp.retryAfterSec, byMobile.retryAfterSec) });
  }

  try {
    const settings = await getSettings();
    const { booking, replayed } = await createBooking(parsed.data, settings);
    await grantAccess(booking.code);
    if (!replayed) after(() => safeNotify(booking, "booking.created", settings));
    return ok({ code: booking.code, status: booking.status, replayed }, { status: replayed ? 200 : 201 });
  } catch (e) {
    if (e instanceof BookingError) {
      const status = e.code === "IDEMPOTENCY_CONFLICT" ? 409 : e.code === "SLOT_UNAVAILABLE" ? 409 : 422;
      return fail(status, e.message, { code: e.code, ...e.extra });
    }
    logError("create booking", e);
    return fail(500, "We couldn't place your booking due to a server problem. Your cart and details are saved — please try again.");
  }
}
