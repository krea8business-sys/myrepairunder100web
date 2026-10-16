import { asc, inArray, sql } from "drizzle-orm";
import { TechniciansManager } from "@/components/admin/TechniciansManager";
import { PageHeader } from "@/components/admin/ui";
import { db, schema } from "@/db";
import { requireAdminPage } from "@/server/admin-auth";

export const metadata = { title: "Technicians" };

export default async function TechniciansAdmin() {
  await requireAdminPage("MANAGER");
  const [techs, skills, cats, counts] = await Promise.all([
    db.select().from(schema.technicians).orderBy(asc(schema.technicians.name)),
    db.select().from(schema.technicianSkills),
    db.select({ id: schema.categories.id, name: schema.categories.name }).from(schema.categories).orderBy(asc(schema.categories.sortOrder)),
    db
      .select({ id: schema.bookings.technicianId, n: sql<number>`count(*)::int` })
      .from(schema.bookings)
      .where(inArray(schema.bookings.status, ["CONFIRMED", "TECHNICIAN_ASSIGNED", "EN_ROUTE", "IN_PROGRESS"]))
      .groupBy(schema.bookings.technicianId),
  ]);
  return (
    <div>
      <PageHeader title="Technicians" description="Directory for assigning bookings. GPS tracking and a technician app are not part of this version." />
      <TechniciansManager
        techs={techs.map((t) => ({ ...t, categoryIds: skills.filter((s) => s.technicianId === t.id).map((s) => s.categoryId), open: Number(counts.find((c) => c.id === t.id)?.n ?? 0) }))}
        categories={cats}
      />
    </div>
  );
}
