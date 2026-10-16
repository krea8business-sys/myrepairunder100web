import { ChevronRight, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Media } from "@/components/catalogue/Media";
import { ServiceCard } from "@/components/catalogue/ServiceCard";
import { CartBar } from "@/components/cart/CartBar";
import { BreadcrumbJsonLd } from "@/components/layout/JsonLd";
import { formatINR } from "@/lib/format";
import { getCatalogue, getCategoryBySlug } from "@/server/catalogue";
import { getSettings } from "@/server/settings";

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params;
  const c = await getCategoryBySlug(category);
  if (!c) return { title: "Service not found" };
  return {
    title: c.seoTitle || `${c.name} in Delhi NCR`,
    description: c.seoDescription || c.description,
    alternates: { canonical: `/services/${c.slug}` },
    openGraph: { title: c.seoTitle || c.name, description: c.seoDescription || c.description, images: c.imageUrl ? [c.imageUrl] : undefined },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params;
  const [c, all, settings] = await Promise.all([getCategoryBySlug(category), getCatalogue(), getSettings()]);
  if (!c) notFound();
  const others = all.filter((x) => x.id !== c.id);

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "Services", path: "/services" }, { name: c.name, path: `/services/${c.slug}` }]} />
      <section className="bg-gradient-to-b from-navy-50 to-white">
        <div className="container-page grid items-center gap-8 py-10 md:grid-cols-[1.3fr_1fr] md:py-14">
          <div>
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
              <Link href="/" className="hover:text-navy-900">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/services" className="hover:text-navy-900">Services</Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-navy-900">{c.name}</span>
            </nav>
            <h1 className="mt-4 text-3xl font-extrabold sm:text-[42px] sm:leading-tight">{c.name} in Delhi NCR</h1>
            <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-muted">{c.longDescription || c.description}</p>
          </div>
          <Media imageUrl={c.imageUrl} illustration={c.illustration} alt={`${c.name}`} className="aspect-[4/3] w-full rounded-3xl shadow-lift" priority sizes="(max-width: 768px) 100vw, 40vw" />
        </div>
      </section>

      <div className="container-page pb-10">
        <div className="mb-6 flex gap-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-sm text-navy-800">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
          <p>
            Prices for repairs that need diagnosis are starting or inspection charges. The technician confirms the final repair cost — including any spare parts — before starting work.
            {settings.visitFee > 0 && <> A {settings.visitFeeLabel.toLowerCase()} of {formatINR(settings.visitFee)} applies once per booking{settings.visitFeeWaiverAbove ? ` (waived for fixed-price services above ${formatINR(settings.visitFeeWaiverAbove)})` : ""}.</>}
          </p>
        </div>
        <h2 className="text-xl font-extrabold">Available services</h2>
        {c.services.length === 0 ? (
          <p className="mt-4 text-ink-muted">No services are available in this category right now.</p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {c.services.map((s) => (
              <ServiceCard key={s.id} service={s} category={c} />
            ))}
          </div>
        )}

        {others.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-extrabold">Other appliances we repair</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {others.map((o) => (
                <li key={o.id}>
                  <Link href={`/services/${o.slug}`} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-navy-800 hover:border-navy-300">
                    {o.name} <ChevronRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <CartBar />
    </>
  );
}
