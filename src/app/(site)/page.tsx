import { ArrowRight, BadgeIndianRupee, Phone, CalendarCheck, ClipboardCheck, Headset, MapPin, ShieldCheck, ShoppingBag, Stethoscope, UserCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { ApplianceArt } from "@/components/brand/ApplianceArt";
import { CategoryCard } from "@/components/catalogue/CategoryCard";
import { ServiceCard } from "@/components/catalogue/ServiceCard";
import { ButtonLink } from "@/components/ui/Button";
import type { FaqItem } from "@/db/schema";
import { getPublishedAreas } from "@/server/areas";
import { getCatalogue, getPopularServices } from "@/server/catalogue";
import { getT } from "@/server/lang";
import { getSettings } from "@/server/settings";
import { LocalBusinessJsonLd } from "@/components/layout/JsonLd";
import { WhatsAppIcon } from "@/components/layout/FloatingContact";
import { telLink, whatsappLink } from "@/lib/format";

export default async function HomePage() {
  const [catalogue, popular, settings, areas, t] = await Promise.all([getCatalogue(), getPopularServices(6), getSettings(), getPublishedAreas(), getT()]);
  const faqs = (settings.faqs as FaqItem[]) ?? [];
  const byCity = new Map<string, { locality: string; pincode: string; slug: string; publishPage: boolean }[]>();
  for (const a of areas) {
    const list = byCity.get(a.city) ?? [];
    list.push(a);
    byCity.set(a.city, list);
  }

  const tel = telLink(settings.supportPhone);
  const wa = whatsappLink(settings.whatsappNumber, `Hi ${settings.businessName}, I want to book a repair.`);

  return (
    <>
      <LocalBusinessJsonLd settings={settings} cities={[...byCity.keys()]} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-100/50 blur-3xl" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-12 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="animate-fade-up">
            <p className="eyebrow">{t("hero.eyebrow")}</p>
            <h1 className="mt-4 text-[34px] font-extrabold leading-[1.08] sm:text-5xl lg:text-[56px]">{t("hero.title")}</h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ink-muted">{t("hero.body")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="#categories" size="lg" className="px-7">
                {t("hero.cta")} <ArrowRight className="h-5 w-5" />
              </ButtonLink>
              <ButtonLink href="/track" size="lg" variant="outline">
                {t("hero.secondary")}
              </ButtonLink>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-navy-800">
              <li className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-success-600" /> No login or signup
              </li>
              <li className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-success-600" /> Inspection before repair
              </li>
              <li className="flex items-center gap-2">
                <BadgeIndianRupee className="h-4 w-4 text-success-600" /> Pay after service
              </li>
            </ul>
            {(tel || wa) && (
              <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-brand-100 bg-white/80 p-3 shadow-card sm:inline-flex">
                <span className="px-1 text-sm font-semibold text-ink-muted">Talk to us:</span>
                {tel && (
                  <a href={tel} className="inline-flex h-11 items-center gap-2 rounded-xl bg-navy-900 px-4 text-[15px] font-bold text-white hover:bg-navy-800" data-testid="hero-call">
                    <Phone className="h-4 w-4" /> {settings.supportPhone}
                  </a>
                )}
                {wa && (
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl bg-success-600 px-4 text-[15px] font-bold text-white hover:bg-success-700" data-testid="hero-whatsapp">
                    <WhatsAppIcon className="h-5 w-5" /> WhatsApp
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {catalogue.slice(0, 4).map((c, i) => (
                <Link
                  key={c.id}
                  href={`/services/${c.slug}`}
                  className={`group overflow-hidden rounded-3xl border border-white bg-white shadow-lift transition hover:-translate-y-1 ${i % 2 === 1 ? "translate-y-6" : ""}`}
                >
                  <ApplianceArt kind={c.illustration} title={c.name} className="aspect-[4/3] w-full" />
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm font-bold text-navy-900">{c.shortName}</span>
                    <ArrowRight className="h-4 w-4 text-brand-700 transition group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="container-page scroll-mt-24 py-14">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t("home.categories")}</h2>
            <p className="mt-2 text-ink-muted">{t("home.categoriesSub")}</p>
          </div>
          <Link href="/services" className="text-sm font-bold text-brand-700 hover:underline">
            All services →
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {catalogue.map((c, i) => (
            <CategoryCard key={c.id} category={c} count={c.services.length} exploreLabel={t("home.explore")} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* POPULAR */}
      {popular.length > 0 && (
        <section className="bg-navy-50/60 py-14">
          <div className="container-page">
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t("home.popular")}</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {popular.map(({ service, category }) => (
                <ServiceCard key={service.id} service={service} category={category} showCategory />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* HOW IT WORKS */}
      <section className="container-page py-16">
        <h2 className="text-2xl font-extrabold sm:text-3xl">{t("home.how")}</h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShoppingBag, title: "Pick your services", body: "Choose your appliance and add one or more services to the cart." },
            { icon: MapPin, title: "Share address & time", body: "Enter your contact details, address and a preferred date and time slot." },
            { icon: CalendarCheck, title: "We confirm the slot", body: "Our team reviews your request and confirms the appointment. Track it anytime." },
            { icon: Wrench, title: "Technician visits", body: "The technician inspects, explains costs before work, and you pay after service." },
          ].map((s, i) => (
            <li key={s.title} className="card relative p-6">
              <span className="absolute right-5 top-5 text-4xl font-extrabold text-navy-100">{i + 1}</span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* TRUST */}
      <section className="bg-navy-950 py-16 text-white">
        <div className="container-page">
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">{t("home.trust")}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: ShieldCheck, title: "Skilled appliance technicians", body: "Technicians who work on ACs, washing machines, refrigerators and microwaves every day." },
              { icon: BadgeIndianRupee, title: "Transparent pricing", body: "Prices are shown before you book. Parts and extra work are always explained and approved by you first." },
              { icon: ClipboardCheck, title: "Inspection before repair", body: "For faults that need diagnosis, you get the repair cost before any work starts — no surprises." },
              { icon: Headset, title: "Service support", body: "Track your booking online with your booking ID and mobile number, and reach our team if you need help." },
            ].map((x) => (
              <div key={x.title} className="rounded-2xl border border-navy-800 bg-navy-900/60 p-6">
                <x.icon className="h-7 w-7 text-brand-100" />
                <h3 className="mt-4 text-lg font-bold text-white">{x.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-navy-200">{x.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AREAS */}
      <section className="container-page py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t("home.areas")}</h2>
            <p className="mt-3 text-ink-muted">
              We currently serve the localities and pincodes listed here across Delhi NCR. Your pincode is checked during checkout, so you&apos;ll know right away if we can reach you.
            </p>
            <ButtonLink href="/areas" variant="outline" className="mt-6">
              View all service areas
            </ButtonLink>
          </div>
          <div className="card p-6">
            {byCity.size === 0 ? (
              <p className="text-ink-muted">Service areas will be listed here soon.</p>
            ) : (
              [...byCity.entries()].map(([city, list]) => (
                <div key={city} className="mb-4 last:mb-0">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-ink-soft">{city}</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {list.map((a) => (
                      <li key={`${a.locality}-${a.pincode}`}>
                        {a.publishPage ? (
                          <Link href={`/areas/${a.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-100 hover:bg-brand-100">
                            <MapPin className="h-3.5 w-3.5" /> {a.locality} · {a.pincode}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 px-3 py-1.5 text-sm font-medium text-navy-800">
                            {a.locality} · {a.pincode}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="bg-navy-50/60 py-16">
          <div className="container-page max-w-3xl">
            <h2 className="text-center text-2xl font-extrabold sm:text-3xl">{t("home.faq")}</h2>
            <div className="mt-8 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group card px-5 py-4 open:shadow-lift">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-bold text-navy-900 [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-700 transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container-page pt-16">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 p-8 text-white sm:p-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Appliance acting up?</h2>
            <p className="mt-2 max-w-lg text-navy-100">Book a technician in a couple of minutes — no account, no OTP, no payment upfront.</p>
          </div>
          <ButtonLink href="/services" size="lg" variant="outline" className="border-white bg-white text-navy-900 hover:bg-navy-50">
            {t("hero.cta")} <ArrowRight className="h-5 w-5" />
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
