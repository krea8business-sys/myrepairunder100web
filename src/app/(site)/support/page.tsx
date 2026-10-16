import { Mail, MessageCircle, Phone, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { telLink, whatsappLink } from "@/lib/format";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Help & support", alternates: { canonical: "/support" } };

export default async function SupportPage() {
  const s = await getSettings();
  const wa = whatsappLink(s.whatsappNumber, `Hi ${s.businessName}, I need help.`);
  const tel = telLink(s.supportPhone);
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="text-3xl font-extrabold">Help & support</h1>
      <p className="mt-2 text-ink-muted">{s.supportHours ? `Support hours: ${s.supportHours}.` : ""} Have your booking ID ready if you&apos;re asking about an existing booking.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href="/track" className="card flex gap-4 p-5 hover:border-navy-300">
          <Search className="h-6 w-6 text-brand-700" />
          <div><h2 className="font-bold">Track a booking</h2><p className="text-sm text-ink-muted">Check status with booking ID + mobile.</p></div>
        </Link>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="card flex gap-4 p-5 hover:border-navy-300">
            <MessageCircle className="h-6 w-6 text-success-600" />
            <div><h2 className="font-bold">WhatsApp</h2><p className="text-sm text-ink-muted">Chat with our team.</p></div>
          </a>
        )}
        {tel && (
          <a href={tel} className="card flex gap-4 p-5 hover:border-navy-300">
            <Phone className="h-6 w-6 text-brand-700" />
            <div><h2 className="font-bold">Call us</h2><p className="text-sm text-ink-muted">{s.supportPhone}</p></div>
          </a>
        )}
        {s.contactEmail && (
          <a href={`mailto:${s.contactEmail}`} className="card flex gap-4 p-5 hover:border-navy-300">
            <Mail className="h-6 w-6 text-brand-700" />
            <div className="min-w-0"><h2 className="font-bold">Email</h2><p className="break-all text-sm text-ink-muted">{s.contactEmail}</p></div>
          </a>
        )}
      </div>
      {!wa && !tel && !s.contactEmail && (
        <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Phone, WhatsApp and email support details haven&apos;t been configured yet. You can still book online and track your booking.</p>
      )}
      <div className="mt-10"><ButtonLink href="/services">Book a service</ButtonLink></div>
    </div>
  );
}
