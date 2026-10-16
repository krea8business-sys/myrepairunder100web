import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { db, schema } from "@/db";
import { requireAdminPage } from "@/server/admin-auth";

export const metadata = { title: "Edit service" };

export default async function ServiceEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ category?: string }> }) {
  await requireAdminPage("MANAGER");
  const { id } = await params;
  const { category } = await searchParams;
  const cats = await db.select({ id: schema.categories.id, name: schema.categories.name, slug: schema.categories.slug }).from(schema.categories).orderBy(asc(schema.categories.sortOrder));
  const service = id === "new" ? null : (await db.select().from(schema.services).where(eq(schema.services.id, id)).limit(1))[0];
  if (id !== "new" && !service) notFound();
  return <ServiceForm service={service ?? null} categories={cats} defaultCategoryId={category ?? cats[0]?.id} />;
}
