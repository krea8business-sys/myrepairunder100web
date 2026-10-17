import { runAfter } from "@/server/after";
import { adminRoute } from "@/server/admin-api";
import { applyBookingAction, bookingActionSchema } from "@/server/admin-bookings";
import { safeNotify } from "@/server/bookings";
import { ok, readJson } from "@/server/http";
import { getSettings } from "@/server/settings";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>("STAFF", async (req, admin, { params }) => {
  const { id } = await params;
  const action = bookingActionSchema.parse(await readJson(req));
  const { booking, statusChanged } = await applyBookingAction(id, action, admin);
  if (statusChanged) {
    const settings = await getSettings();
    runAfter(() => safeNotify(booking, "booking.status_changed", settings));
  }
  return ok({ ok: true, status: booking.status });
});
