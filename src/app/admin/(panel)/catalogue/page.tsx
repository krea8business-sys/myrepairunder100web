import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import Link from "next/link";
import { CatalogueRowToggles } from "@/components/admin/CatalogueRowToggles";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import { buttonClass } from "@/components/ui/Button";
import { db, schema } from "@/db";
import { formatINR } from "@/lib/format";
import { requireAdminPage } from "@/server/admin-auth";

export const metadata = { title: "Services & prices" };

export default async function CataloguePage() {
  await requireAdminPage("MANAGER");
  const [cats, svcs] = await Promise.all([
    db.select().from(schema.categories).orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name)),
    db.select().from(schema.services).orderBy(asc(schema.services.sortOrder), asc(schema.services.name)),
  ]);
  const demoCount = svcs.filter((s) => s.priceIsDemo && !s.archived).length;
  return (
    <div>
      <PageHeader
        title="Services & prices"
        description="Changes appear on the website immediately."
        actions={<Link href="/admin/catalogue/categories/new" className={buttonClass("primary", "sm")}><Plus className="h-4 w-4" /> Add category</Link>}
      />
      {demoCount > 0 && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{demoCount} services still show a <strong>Demo price</strong> label. Edit each service, set your real price and untick “Demo price”.</p>}
      <div className="space-y-6">
        {cats.map((c) => {
          const list = svcs.filter((s) => s.categoryId === c.id);
          return (
            <Panel
              key={c.id}
              title={c.name}
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  {!c.active && <Badge tone="slate">Inactive</Badge>}
                  {c.archived && <Badge tone="red">Archived</Badge>}
                  <Link href={`/admin/catalogue/categories/${c.id}`} className={buttonClass("outline", "sm")}>Edit category</Link>
                  <Link href={`/admin/catalogue/services/new?category=${c.id}`} className={buttonClass("secondary", "sm")}><Plus className="h-4 w-4" /> Service</Link>
                </div>
              }
            >
              <div className="-mx-5 overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
                    <tr><th className="px-5 py-2">Service</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Visibility</th><th className="px-5 py-2 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {list.map((s) => (
                      <tr key={s.id} className={s.archived ? "opacity-50" : ""}>
                        <td className="px-5 py-2.5">
                          <Link href={`/admin/catalogue/services/${s.id}`} className="font-semibold hover:text-brand-700">{s.name}</Link>
                          <span className="block text-xs text-ink-soft">/{c.slug}/{s.slug}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {s.priceType === "QUOTE" || s.price == null ? "TBC" : `${s.priceType === "STARTING" ? "from " : ""}${formatINR(s.price)}${s.priceType === "INSPECTION" ? " insp." : ""}`}
                          {s.priceIsDemo && <Badge tone="amber" className="ml-2">demo</Badge>}
                        </td>
                        <td className="px-3 py-2.5"><CatalogueRowToggles id={s.id} active={s.active} popular={s.popular} archived={s.archived} /></td>
                        <td className="px-5 py-2.5 text-right"><Link href={`/admin/catalogue/services/${s.id}`} className="font-semibold text-brand-700 hover:underline">Edit</Link></td>
                      </tr>
                    ))}
                    {list.length === 0 && <tr><td colSpan={4} className="px-5 py-6 text-center text-ink-muted">No services yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
