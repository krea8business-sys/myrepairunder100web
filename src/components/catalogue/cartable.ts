import type { Category, Service } from "@/db/schema";
import type { CartableService } from "@/components/cart/AddToCart";

export function toCartable(s: Service, c: Category): CartableService {
  return {
    serviceId: s.id,
    name: s.name,
    slug: s.slug,
    categoryId: c.id,
    categoryName: c.name,
    categorySlug: c.slug,
    illustration: c.illustration,
    priceType: s.priceType,
    price: s.price,
    priceIsDemo: s.priceIsDemo,
    allowQuantity: s.allowQuantity,
    maxQuantity: s.maxQuantity,
  };
}
