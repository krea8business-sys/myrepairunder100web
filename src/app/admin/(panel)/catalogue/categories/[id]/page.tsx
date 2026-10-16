import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/CategoryForm";
import { db, schema } from "@/db";
import { requireAdminPage } from "@/server/admin-auth";

export const metadata = { title: "Edit category" };

export default async function CategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("MANAGER");
  const { id } = await params;
  const c = id === "new" ? null : (await db.select().from(schema.categories).where(eq(schema.categories.id, id)).limit(1))[0];
  if (id !== "new" && !c) notFound();
  return <CategoryForm category={c ?? null} />;
}
