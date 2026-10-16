import type { Metadata } from "next";
import Link from "next/link";
import { ServiceCard } from "@/components/catalogue/ServiceCard";
import { Media } from "@/components/catalogue/Media";
import { getCatalogue } from "@/server/catalogue";

export const metadata: Metadata = {
  title: "All Appliance Repair Services in Delhi NCR",
  description: "AC service & repair, washing machine, refrigerator and microwave repair services with transparent prices. Book online in Delhi NCR.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const catalogue = await getCatalogue();
  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
        <Link href="/" className="hover:text-navy-900">Home</Link> / <span className="text-navy-900">Services</span>
      </nav>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">All services</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">Pick services from any appliance — you can book several together in one visit request.</p>

      <div className="sticky top-16 z-30 -mx-4 mt-6 border-b border-line bg-white/95 px-4 py-3 backdrop-blur md:top-16">
        <ul className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {catalogue.map((c) => (
            <li key={c.id} className="shrink-0">
              <a href={`#${c.slug}`} className="inline-flex rounded-full bg-navy-50 px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-100">
                {c.name}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {catalogue.map((c) => (
        <section key={c.id} id={c.slug} className="scroll-mt-36 pt-10">
          <div className="flex items-center gap-4">
            <Media imageUrl={c.imageUrl} illustration={c.illustration} alt="" className="h-14 w-16 shrink-0 rounded-xl" sizes="64px" />
            <div className="min-w-0">
              <h2 className="text-xl font-extrabold sm:text-2xl">
                <Link href={`/services/${c.slug}`} className="hover:text-brand-700">{c.name}</Link>
              </h2>
              <p className="text-sm text-ink-muted">{c.tagline}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {c.services.map((s) => (
              <ServiceCard key={s.id} service={s} category={c} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
