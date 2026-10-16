import { z } from "zod";
import { checkServiceability } from "@/server/areas";
import { clientIp, fail, logError, ok, readJson } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

const schema = z.object({
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  categoryIds: z.array(z.string().max(64)).max(20).optional().default([]),
});

export async function POST(req: Request) {
  try {
    const rl = await rateLimit("svc", await clientIp(), 60, 600);
    if (!rl.allowed) return fail(429, "Too many checks. Please wait a few minutes.");
    const parsed = schema.safeParse(await readJson(req, 4000));
    if (!parsed.success) return fail(422, parsed.error.issues[0].message);
    const r = await checkServiceability(parsed.data.pincode, parsed.data.categoryIds);
    return ok(r);
  } catch (e) {
    logError("serviceability", e);
    return fail(500, "Couldn't check this pincode right now. Please try again.");
  }
}
