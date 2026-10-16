import "server-only";
import { cache } from "react";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Category, Service } from "@/db/schema";
import type { PricedService } from "@/lib/pricing";

export type CategoryWithServices = Category & { services: Service[] };

const visibleService = and(eq(schema.services.active, true), eq(schema.services.archived, false));
const visibleCategory = and(eq(schema.categories.active, true), eq(schema.categories.archived, false));

export const getCatalogue = cache(async (): Promise<CategoryWithServices[]> => {
  const cats = await db.select().from(schema.categories).where(visibleCategory).orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));
  if (cats.length === 0) return [];
  const svcs = await db
    .select()
    .from(schema.services)
    .where(and(visibleService, inArray(schema.services.categoryId, cats.map((c) => c.id))))
    .orderBy(asc(schema.services.sortOrder), asc(schema.services.name));
  return cats.map((c) => ({ ...c, services: svcs.filter((s) => s.categoryId === c.id) }));
});

export const getCategoryBySlug = cache(async (slug: string) => {
  const all = await getCatalogue();
  return all.find((c) => c.slug === slug) ?? null;
});

export async function getServiceBySlugs(categorySlug: string, serviceSlug: string) {
  const cat = await getCategoryBySlug(categorySlug);
  if (!cat) return null;
  const service = cat.services.find((s) => s.slug === serviceSlug);
  if (!service) return null;
  return { category: cat, service };
}

export async function getPopularServices(limit = 8) {
  const all = await getCatalogue();
  const out: { category: Category; service: Service }[] = [];
  for (const c of all) for (const s of c.services) if (s.popular) out.push({ category: c, service: s });
  return out.slice(0, limit);
}

/** Bookable services by id (active service in an active category), with category names. */
export async function getBookableServices(ids: string[]): Promise<Map<string, PricedService & { slug: string; categorySlug: string }>> {
  const map = new Map<string, PricedService & { slug: string; categorySlug: string }>();
  if (ids.length === 0) return map;
  const rows = await db
    .select({ s: schema.services, c: schema.categories })
    .from(schema.services)
    .innerJoin(schema.categories, eq(schema.services.categoryId, schema.categories.id))
    .where(and(inArray(schema.services.id, ids), visibleService, visibleCategory));
  for (const { s, c } of rows) {
    map.set(s.id, {
      id: s.id,
      slug: s.slug,
      categorySlug: c.slug,
      name: s.name,
      categoryId: c.id,
      categoryName: c.name,
      priceType: s.priceType,
      price: s.price,
      partsExtra: s.partsExtra,
      requiresDiagnosis: s.requiresDiagnosis,
      allowQuantity: s.allowQuantity,
      maxQuantity: s.maxQuantity,
      priceIsDemo: s.priceIsDemo,
    });
  }
  return map;
}
