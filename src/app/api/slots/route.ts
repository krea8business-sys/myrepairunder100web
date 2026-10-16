import { fail, logError, ok } from "@/server/http";
import { getAvailability } from "@/server/schedule";
import { getSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

/** Available dates & slots computed from admin schedule config and live booking counts (no fake availability). */
export async function GET() {
  try {
    const settings = await getSettings();
    const days = await getAvailability(settings);
    return ok({ timezone: "Asia/Kolkata", days });
  } catch (e) {
    logError("slots", e);
    return fail(500, "Couldn't load available slots. Please try again.");
  }
}
