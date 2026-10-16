import { asc } from "drizzle-orm";
import { AreasManager } from "@/components/admin/AreasManager";
import { PageHeader } from "@/components/admin/ui";
import { db, schema } from "@/db";
import { requireAdminPage } from "@/server/admin-auth";

export const metadata = { title: "Service areas" };

export default async function AreasAdmin() {
  await requireAdminPage("MANAGER");
  const [areas, links, cats] = await Promise.all([
    db.select().from(schema.serviceAreas).orderBy(asc(schema.serviceAreas.city), asc(schema.serviceAreas.locality)),
    db.select().from(schema.areaCategories),
    db.select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
  ]);
  return (
    <div>
      <PageHeader title="Service areas" description="Only active pincodes can be booked. Leave categories empty to allow all services in an area. Published areas get a local landing page." />
      <AreasManager areas={areas.map((a) => ({ ...a, categoryIds: links.filter((l) => l.areaId === a.id).map((l) => l.categoryId) }))} categories={cats} />
    </div>
  );
}
