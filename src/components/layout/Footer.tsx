import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { telLink, whatsappLink } from "@/lib/format";
import type { PublicSettings } from "@/server/settings";

export function Footer({ settings, categories }: { settings: PublicSettings; categories: { slug: string; name: string }[] }) {
  const tel = telLink(settings.supportPhone);
  const wa = whatsappLink(settings.whatsappNumber);
  const hasContact = tel || wa || settings.contactEmail;
  return (
    <footer className="mt-20 bg-navy-950 pb-24 text-navy-200 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <Logo logoUrl={settings.logoUrl} name={settings.businessName} invert />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-navy-300">{settings.tagline}</p>
          {settings.supportHours && <p className="mt-3 text-sm text-navy-300">Support hours: {settings.supportHours}</p>}
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Services</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/services/${c.slug}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/areas" className="hover:text-white">
                Service areas
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Bookings & policies</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li><Link href="/track" className="hover:text-white">Track / look up a booking</Link></li>
            <li><Link href="/policies/service" className="hover:text-white">Service policy</Link></li>
            <li><Link href="/policies/cancellation" className="hover:text-white">Cancellation policy</Link></li>
            <li><Link href="/policies/warranty" className="hover:text-white">Warranty policy</Link></li>
            <li><Link href="/policies/privacy" className="hover:text-white">Privacy policy</Link></li>
            <li><Link href="/policies/terms" className="hover:text-white">Terms of service</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {tel && (
              <li>
                <a href={tel} className="inline-flex items-center gap-2 hover:text-white"><Phone className="h-4 w-4" /> {settings.supportPhone}</a>
              </li>
            )}
            {wa && (
              <li>
                <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white"><MessageCircle className="h-4 w-4" /> WhatsApp support</a>
              </li>
            )}
            {settings.contactEmail && (
              <li>
                <a href={`mailto:${settings.contactEmail}`} className="inline-flex items-center gap-2 break-all hover:text-white"><Mail className="h-4 w-4 shrink-0" /> {settings.contactEmail}</a>
              </li>
            )}
            {settings.businessAddress && (
              <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {settings.businessAddress}</li>
            )}
            {!hasContact && <li className="text-navy-300">Contact details will appear here once configured.</li>}
            <li><Link href="/support" className="font-semibold text-white hover:underline">Help & support →</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-900">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-navy-400 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} {settings.businessName}. All rights reserved.</p>
          <p>Serving selected areas of Delhi NCR · Prices in INR</p>
        </div>
      </div>
    </footer>
  );
}
