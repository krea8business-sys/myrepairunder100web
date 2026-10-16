import { z } from "zod";
import { clientIp, fail, logError, ok, readJson } from "@/server/http";
import { mapsConfigured, reverseGeocode } from "@/server/integrations/maps";
import { rateLimit } from "@/server/rate-limit";

const schema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });

/** Returns an address suggestion only when a geocoding provider is configured. */
export async function POST(req: Request) {
  try {
    if (!mapsConfigured()) return ok({ configured: false });
    const rl = await rateLimit("geo", await clientIp(), 20, 3600);
    if (!rl.allowed) return fail(429, "Too many requests.");
    const parsed = schema.safeParse(await readJson(req, 500));
    if (!parsed.success) return fail(422, "Invalid coordinates");
    const result = await reverseGeocode(parsed.data.lat, parsed.data.lng);
    return ok({ configured: true, result });
  } catch (e) {
    logError("geocode", e);
    return fail(500, "Couldn't look up your location. Please enter your address manually.");
  }
}
