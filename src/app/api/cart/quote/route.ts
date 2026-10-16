import { z } from "zod";
import { calculateQuote } from "@/lib/pricing";
import { getBookableServices } from "@/server/catalogue";
import { fail, logError, ok, readJson } from "@/server/http";
import { getSettings, pricingSettings } from "@/server/settings";

const schema = z.object({
  items: z.array(z.object({ serviceId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(20) })).max(20),
});

/** Server-side quote from trusted catalogue data. Also reports items no longer available. */
export async function POST(req: Request) {
  try {
    const parsed = schema.safeParse(await readJson(req, 8000));
    if (!parsed.success) return fail(422, "Invalid cart");
    const settings = await getSettings();
    const ids = [...new Set(parsed.data.items.map((i) => i.serviceId))];
    const map = await getBookableServices(ids);
    const unavailable = ids.filter((id) => !map.has(id));
    const merged = new Map<string, number>();
    for (const i of parsed.data.items) if (map.has(i.serviceId)) merged.set(i.serviceId, (merged.get(i.serviceId) ?? 0) + i.quantity);
    const quote = calculateQuote(
      [...merged.entries()].map(([id, q]) => ({ service: map.get(id)!, quantity: q })),
      pricingSettings(settings),
    );
    const services = Object.fromEntries(
      [...map.values()].map((s) => [
        s.id,
        { name: s.name, slug: s.slug, categoryId: s.categoryId, categoryName: s.categoryName, categorySlug: s.categorySlug, priceType: s.priceType, price: s.price, priceIsDemo: Boolean(s.priceIsDemo), allowQuantity: s.allowQuantity, maxQuantity: s.maxQuantity },
      ]),
    );
    return ok({ quote, unavailable, services, visitFeeIsDemo: settings.visitFeeIsDemo });
  } catch (e) {
    logError("cart quote", e);
    return fail(500, "Couldn't load current prices. Please try again.");
  }
}
