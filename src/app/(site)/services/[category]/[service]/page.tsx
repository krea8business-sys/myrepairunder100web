import { CheckCircle2, ChevronRight, Clock, MapPin, ShieldCheck, Stethoscope, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartPanel } from "@/components/cart/AddToCart";
import { CartBar } from "@/components/cart/CartBar";
import { toCartable } from "@/components/catalogue/cartable";
import { Media } from "@/components/catalogue/Media";
import { ServiceCard } from "@/components/catalogue/ServiceCard";
import { BreadcrumbJsonLd, ServiceJsonLd } from "@/components/layout/JsonLd";
import { Price } from "@/components/ui/Price";
import { formatDuration, formatINR } from "@/lib/format";
import { getServiceBySlugs } from "@/server/catalogue";
import { getSettings } from "@/server/settings";

type Props = { params: Promise<{ category: string; service: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category, service } = await params;
  const r = await getServiceBySlugs(category, service);
  if (!r) return { title: "Service not found" };
  const title = `${r.service.name} — ${r.category.shortName} repair in Delhi NCR`;
  return {
    title,
    description: `${r.service.shortDescription} ${r.service.description}`.slice(0, 158),
    alternates: { canonical: `/services/${r.category.slug}/${r.service.slug}` },
    openGraph: { title, description: r.service.shortDescription },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { category, service } = await params;
  const [r, settings] = await Promise.all([getServiceBySlugs(category, service), getSettings()]);
  if (!r) notFound();
  const { service: s, category: c } = r;
  const related = c.services.filter((x) => x.id !== s.id).sort((a, b) => Number(b.popular) - Number(a.popular)).slice(0, 4);
  const duration = formatDuration(s.durationMinutes);
  const path = `/services/${c.slug}/${s.slug}`;

  return (
    <>
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: c.name, path: `/services/${c.slug}` }, { name: s.name, path }]} />
      <ServiceJsonLd name={s.name} description={s.description || s.shortDescription} path={path} price={s.priceIsDemo ? null : s.priceType === "QUOTE" ? null : s.price} settings={settings} />

      <div className="container-page py-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
          <Link href="/" className="hover:text-navy-900">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href={`/services/${c.slug}`} className="hover:text-navy-900">{c.name}</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-navy-900">{s.name}</span>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
          <div>
            <Media imageUrl={s.imageUrl ?? c.imageUrl} illustration={c.illustration} alt={s.name} className="aspect-[16/9] w-full rounded-3xl" priority sizes="(max-width: 1024px) 100vw, 60vw" />
            <h1 className="mt-6 text-3xl font-extrabold sm:text-4xl">{s.name}</h1>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">{s.description || s.shortDescription}</p>

            {(s.requiresDiagnosis || s.priceType === "INSPECTION" || s.priceType === "STARTING" || s.priceType === "QUOTE") && (
              <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <Stethoscope className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  <strong>How pricing works for this service:</strong>{" "}
                  {s.priceType === "INSPECTION"
                    ? "The price shown is the inspection / diagnosis charge. After inspection, the technician will tell you the repair cost, including any spare parts. Repair work starts only after you approve it."
                    : s.priceType === "STARTING"
                      ? "The price shown is a starting price. The final cost depends on the appliance's condition and any parts needed, and is confirmed by the technician before work starts."
                      : "The price will be confirmed by the technician after seeing the appliance, before any work starts."}
                </p>
              </div>
            )}

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="card p-5">
                <h2 className="text-base font-bold">What&apos;s included</h2>
                <ul className="mt-3 space-y-2.5">
                  {s.inclusions.length ? (
                    s.inclusions.map((x) => (
                      <li key={x} className="flex gap-2.5 text-sm text-ink">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" /> {x}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-ink-muted">Details will be shared by the technician.</li>
                  )}
                </ul>
              </div>
              <div className="card p-5">
                <h2 className="text-base font-bold">What&apos;s not included</h2>
                <ul className="mt-3 space-y-2.5">
                  {s.exclusions.map((x) => (
                    <li key={x} className="flex gap-2.5 text-sm text-ink">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> {x}
                    </li>
                  ))}
                  {s.partsExtra && !s.exclusions.some((x) => /part/i.test(x)) && (
                    <li className="flex gap-2.5 text-sm text-ink">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> Spare parts (charged separately if needed)
                    </li>
                  )}
                </ul>
              </div>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-navy-50 p-4">
                <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft"><Clock className="h-3.5 w-3.5" /> Est. duration</dt>
                <dd className="mt-1 font-bold text-navy-900">{duration ? `~${duration}` : "Depends on the fault"}</dd>
              </div>
              <div className="rounded-2xl bg-navy-50 p-4">
                <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft"><ShieldCheck className="h-3.5 w-3.5" /> Warranty</dt>
                <dd className="mt-1 font-bold text-navy-900">
                  {s.warrantyDays ? `${s.warrantyDays} days` : s.warrantyNote ? s.warrantyNote : <Link href="/policies/warranty" className="text-brand-700 hover:underline">As per warranty policy</Link>}
                </dd>
              </div>
              <div className="rounded-2xl bg-navy-50 p-4">
                <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft"><MapPin className="h-3.5 w-3.5" /> Availability</dt>
                <dd className="mt-1 font-bold text-navy-900">
                  <Link href="/areas" className="hover:underline">Selected Delhi NCR pincodes</Link>
                </dd>
              </div>
            </dl>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-soft">{c.name}</p>
              <div className="mt-2">
                <Price priceType={s.priceType} price={s.price} priceIsDemo={s.priceIsDemo} size="lg" />
              </div>
              <ul className="mt-4 space-y-2 border-t border-line pt-4 text-sm text-ink-muted">
                {settings.visitFee > 0 ? (
                  <li>
                    + {settings.visitFeeLabel}: <strong className="text-navy-900">{formatINR(settings.visitFee)}</strong> once per booking
                    {settings.visitFeeWaiverAbove ? ` (waived above ${formatINR(settings.visitFeeWaiverAbove)} of fixed-price services)` : ""}
                  </li>
                ) : (
                  <li>No separate visit charge</li>
                )}
                {s.partsExtra && <li>Spare parts, if needed, are charged extra after your approval</li>}
                <li>Pay after service · No advance payment</li>
              </ul>
              <div className="mt-5">
                <AddToCartPanel service={toCartable(s, c)} />
              </div>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-extrabold">Related {c.shortName.toLowerCase()} services</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {related.map((x) => (
                <ServiceCard key={x.id} service={x} category={c} />
              ))}
            </div>
          </section>
        )}
      </div>
      <CartBar />
    </>
  );
}
