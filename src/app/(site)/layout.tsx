import { DemoBanner } from "@/components/layout/DemoBanner";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Analytics } from "@/components/layout/Analytics";
import { FloatingContact } from "@/components/layout/FloatingContact";
import { telLink, whatsappLink } from "@/lib/format";
import { ToastProvider } from "@/components/ui/Toast";
import { translator } from "@/lib/i18n";
import { getCatalogue } from "@/server/catalogue";
import { getLang } from "@/server/lang";
import { getSettings, toPublicSettings } from "@/server/settings";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, catalogue, lang] = await Promise.all([getSettings(), getCatalogue(), getLang()]);
  const pub = toPublicSettings(settings);
  const t = translator(lang);
  return (
    <ToastProvider>
      <a href="#main" className="sr-only z-[100] rounded-lg bg-white px-4 py-2 font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <DemoBanner show={pub.showDemoBanner} announcement={pub.announcement} />
      <Header settings={pub} lang={lang} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <Footer settings={pub} categories={catalogue.map((c) => ({ slug: c.slug, name: c.name }))} />
      <MobileNav labels={{ home: t("nav.home"), services: t("nav.services"), cart: t("nav.cart"), track: t("nav.track") }} />
      <FloatingContact whatsappHref={whatsappLink(pub.whatsappNumber, `Hi ${pub.businessName}, I want to book a repair.`)} telHref={telLink(pub.supportPhone)} />
      <Analytics />
    </ToastProvider>
  );
}
