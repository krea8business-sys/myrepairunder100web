import { MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { CartIcon } from "@/components/cart/CartIcon";
import { telLink, whatsappLink } from "@/lib/format";
import { WhatsAppIcon } from "./FloatingContact";
import type { Lang } from "@/lib/i18n";
import { translator } from "@/lib/i18n";
import type { PublicSettings } from "@/server/settings";
import { AreaSelector } from "./AreaSelector";
import { LangToggle } from "./LangToggle";

export function Header({ settings, lang }: { settings: PublicSettings; lang: Lang }) {
  const t = translator(lang);
  const wa = whatsappLink(settings.whatsappNumber, `Hi ${settings.businessName}, I need help with a repair booking.`);
  const tel = telLink(settings.supportPhone);
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo logoUrl={settings.logoUrl} name={settings.businessName} />
        <div className="hidden md:block">
          <AreaSelector label={t("header.area")} cta={t("header.checkPincode")} />
        </div>
        <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Main">
          <Link href="/services" className="rounded-lg px-3 py-2 text-[15px] font-semibold text-navy-800 hover:bg-navy-50">
            {t("nav.services")}
          </Link>
          <Link href="/track" className="rounded-lg px-3 py-2 text-[15px] font-semibold text-navy-800 hover:bg-navy-50">
            {t("nav.track")}
          </Link>
          <Link href="/areas" className="rounded-lg px-3 py-2 text-[15px] font-semibold text-navy-800 hover:bg-navy-50">
            {t("nav.areas")}
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-0 sm:gap-1 lg:ml-2">
          {tel && (
            <a href={tel} className="inline-flex h-11 items-center gap-2 rounded-xl px-2.5 text-[15px] font-bold text-navy-900 hover:bg-brand-50" aria-label={`Call ${settings.supportPhone}`} data-testid="header-call">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-600"><Phone className="h-4 w-4" /></span>
              <span className="hidden xl:inline">{settings.supportPhone}</span>
            </a>
          )}
          <LangToggle lang={lang} />
          {wa ? (
            <a href={wa} target="_blank" rel="noopener noreferrer" className="hidden h-10 items-center gap-2 rounded-xl bg-success-600 px-3.5 text-sm font-bold text-white hover:bg-success-700 sm:inline-flex" aria-label="Chat with us on WhatsApp" data-testid="header-whatsapp">
              <WhatsAppIcon className="h-5 w-5" /> <span className="hidden md:inline">WhatsApp</span>
            </a>
          ) : (
            <Link href="/support" className="hidden h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-navy-800 hover:bg-navy-50 sm:inline-flex">
              <MessageCircle className="h-5 w-5" /> <span className="hidden xl:inline">{t("nav.support")}</span>
            </Link>
          )}
          <CartIcon />
        </div>
      </div>
      <div className="border-t border-line/70 px-4 py-2 md:hidden">
        <AreaSelector label={t("header.area")} cta={t("header.checkPincode")} />
      </div>
    </header>
  );
}
