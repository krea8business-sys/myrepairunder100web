import { and, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryCard } from "@/components/catalogue/CategoryCard";
import { ButtonLink } from "@/components/ui/Button";
import { BreadcrumbJsonLd } from "@/components/layout/JsonLd";
import { db, schema } from "@/db";
import { getCatalogue } from "@/server/catalogue";

type Props = { params: Promise<{ slug: string }> };

/** Local landing pages exist ONLY for areas an admin has published with their own local intro (no doorway pages). */
async function loadArea(slug: string) {
  const rows = await db.select().from(schema.serviceAreas).where(and(eq(schema.serviceAreas.slug, slug), eq(schema.serviceAreas.active, true)));
  const published = rows.filter((r) => r.publishPage && r.pageIntro);
  if (published.length === 0) return null;
  const links = await db.select().from(schema.areaCategories).where(inArray(schema.areaCategories.areaId, rows.map((r) => r.id)));
  return { rows, main: published[0], categoryIds: links.length ? new Set(links.map((l) => l.categoryId)) : null };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await loadArea(slug);
  if (!a) return { title: "Area not found" };
  return {
    title: `Appliance Repair in ${a.main.locality}, ${a.main.city} — AC, Fridge, Washing Machine`,
    description: `Book AC repair, fridge repair, washing machine and microwave repair in ${a.main.locality} (${[...new Set(a.rows.map((r) => r.pincode))].join(", ")}). Online booking, pay after service.`,
    alternates: { canonical: `/areas/${slug}` },
  };
}

export default async function AreaPage({ params }: Props) {
  const { slug } = await params;
  const [a, catalogue] = await Promise.all([loadArea(slug), getCatalogue()]);
  if (!a) notFound();
  const cats = catalogue.filter((c) => !a.categoryIds || a.categoryIds.has(c.id));
  const pins = [...new Set(a.rows.map((r) => r.pincode))];
  return (
    <div className="container-page py-10">
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Service areas", path: "/areas" }, { name: a.main.locality, path: `/areas/${slug}` }]} />
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted"><Link href="/areas" className="hover:text-navy-900">Service areas</Link> / <span className="text-navy-900">{a.main.locality}</span></nav>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">Appliance repair in {a.main.locality}, {a.main.city}</h1>
      <div className="mt-4 max-w-3xl space-y-3 text-[16px] leading-relaxed text-ink-muted">
        {a.main.pageIntro!.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <p className="mt-4 text-sm font-semibold text-navy-800">Pincodes covered: {pins.join(", ")}</p>
      <h2 className="mt-10 text-xl font-extrabold">Services available in {a.main.locality}</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cats.map((c) => <CategoryCard key={c.id} category={c} count={c.services.length} />)}
      </div>
      <div className="card mt-10 p-6">
        <h2 className="text-lg font-bold">Booking in {a.main.locality}</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-ink-muted">
          <li>Add the services you need to your cart.</li>
          <li>Enter your {a.main.locality} address with pincode {pins[0]} — we check coverage instantly.</li>
          <li>Pick a preferred slot; we confirm it after checking technician availability.</li>
        </ol>
        <ButtonLink href="/services" className="mt-5">Book a service</ButtonLink>
      </div>
    </div>
  );
}
