import type { MetadataRoute } from "next";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCatalogue } from "@/server/catalogue";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const now = new Date();
  const catalogue = await getCatalogue();
  const areas = await db.select().from(schema.serviceAreas).where(eq(schema.serviceAreas.active, true));
  const areaSlugs = [...new Set(areas.filter((a) => a.publishPage && a.pageIntro).map((a) => a.slug))];
  return [
    { url: `${base}/`, lastModified: now, priority: 1 },
    { url: `${base}/services`, lastModified: now, priority: 0.9 },
    ...catalogue.map((c) => ({ url: `${base}/services/${c.slug}`, lastModified: c.updatedAt, priority: 0.9 })),
    ...catalogue.flatMap((c) => c.services.map((s) => ({ url: `${base}/services/${c.slug}/${s.slug}`, lastModified: s.updatedAt, priority: 0.7 }))),
    { url: `${base}/areas`, lastModified: now, priority: 0.6 },
    ...areaSlugs.map((s) => ({ url: `${base}/areas/${s}`, lastModified: now, priority: 0.7 })),
    { url: `${base}/track`, lastModified: now, priority: 0.4 },
    ...["service", "cancellation", "warranty", "privacy", "terms"].map((p) => ({ url: `${base}/policies/${p}`, lastModified: now, priority: 0.2 })),
  ];
}
