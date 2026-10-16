import { CalendarDays, CheckCircle2, Clock, MapPin, MessageCircle, Phone, User, Wrench } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CancelRequest } from "@/components/booking/CancelRequest";
import { CopyButton } from "@/components/booking/CopyButton";
import { StatusProgress } from "@/components/booking/StatusProgress";
import { TrackForm } from "@/components/booking/TrackForm";
import { ButtonLink } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateLabel, formatDateTimeIST, formatINR, telLink, whatsappLink } from "@/lib/format";
import { BOOKING_CODE } from "@/lib/validation";
import { getPublicBooking } from "@/server/bookings";
import { canAccess } from "@/server/customer-access";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Your booking", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BookingPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ new?: string }> }) {
  const { code: raw } = await params;
  const { new: isNew } = await searchParams;
  const code = raw.toUpperCase();
  const settings = await getSettings();
  const allowed = BOOKING_CODE.test(code) && (await canAccess(code));
  const b = allowed ? await getPublicBooking(code, settings) : null;

  if (!b) {
    return (
      <div className="container-page max-w-xl py-12">
        <h1 className="text-2xl font-extrabold">View booking</h1>
        <p className="mt-2 text-ink-muted">To protect customer privacy, please confirm the mobile number used for this booking.</p>
        <div className="card mt-6 p-6">
          <TrackForm initialCode={BOOKING_CODE.test(code) ? code : ""} />
        </div>
      </div>
    );
  }

  const wa = whatsappLink(settings.whatsappNumber, `Hi, I need help with my booking ${b.code}.`);
  const tel = telLink(settings.supportPhone);
  const justBooked = isNew === "1" && b.status === "RECEIVED";

  return (
    <div className="container-page max-w-4xl py-8">
      {justBooked ? (
        <section className="animate-fade-up rounded-3xl bg-gradient-to-br from-success-50 to-white p-6 text-center ring-1 ring-success-100 sm:p-10" data-testid="booking-confirmation">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success-500 text-white shadow-lift">
            <CheckCircle2 className="h-9 w-9" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">Booking request received!</h1>
          <p className="mx-auto mt-2 max-w-lg text-ink-muted">
            Thank you, {b.customerName.split(" ")[0]}. Your request is saved. Our team will review it and confirm your appointment — you&apos;ll see the status change here.
          </p>
          <div className="mx-auto mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-card ring-1 ring-line">
            <span className="text-sm text-ink-muted">Booking ID</span>
            <span className="font-mono text-xl font-extrabold tracking-wider text-navy-900" data-testid="booking-code">{b.code}</span>
            <CopyButton value={b.code} />
          </div>
          <p className="mt-3 text-xs text-ink-muted">Save this ID. You&apos;ll need it with your mobile number to track this booking.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <ButtonLink href={`/track?code=${b.code}`} variant="outline" size="sm">Track Booking</ButtonLink>
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-success-600 px-3 text-sm font-semibold text-white hover:bg-success-700"><MessageCircle className="h-4 w-4" /> WhatsApp support</a>}
            <ButtonLink href="/services" variant="ghost" size="sm">Book another service</ButtonLink>
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-ink-muted">Booking</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-mono text-2xl font-extrabold tracking-wide" data-testid="booking-code">{b.code}</h1>
              <CopyButton value={b.code} />
            </div>
          </div>
          <StatusBadge status={b.status} className="self-start px-3 py-1 text-sm" />
        </div>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="card p-5 sm:p-6" aria-labelledby="status-h">
            <div className="flex items-center justify-between gap-3">
              <h2 id="status-h" className="text-lg font-bold">Status</h2>
              <StatusBadge status={b.status} />
            </div>
            <p className="mt-2 text-sm text-ink-muted" data-testid="status-message">{b.statusMessage}</p>
            {b.cancelRequested && b.status !== "CANCELLED" && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Cancellation requested — our team will review it and update the status.</p>
            )}
            {b.status === "CANCELLED" && b.cancelledReason && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">Reason: {b.cancelledReason}</p>}
            {b.status !== "CANCELLED" && <StatusProgress status={b.status} />}
            {b.technicianAssigned && b.status !== "CANCELLED" && (
              <p className="mt-4 flex items-center gap-2 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">
                <Wrench className="h-4 w-4" /> Technician assigned{b.technicianFirstName ? `: ${b.technicianFirstName}` : ""}. They&apos;ll contact you before the visit.
              </p>
            )}
          </section>

          <section className="card p-5 sm:p-6">
            <h2 className="text-lg font-bold">Services</h2>
            <ul className="mt-3 divide-y divide-line">
              {b.items.map((i) => (
                <li key={i.name} className="flex justify-between gap-4 py-3 text-sm">
                  <span>
                    <span className="font-semibold text-navy-900">{i.name}</span>
                    {i.quantity > 1 && <span className="text-ink-muted"> × {i.quantity}</span>}
                    <span className="block text-xs text-ink-soft">{i.category}{i.priceType === "STARTING" ? " · starting price" : i.priceType === "INSPECTION" ? " · inspection charge" : ""}</span>
                  </span>
                  <span className="shrink-0 font-semibold">{i.priceType === "QUOTE" ? "TBC" : formatINR(i.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink-muted">Services subtotal</dt><dd>{formatINR(b.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-muted">{settings.visitFeeLabel}</dt><dd>{b.visitFee > 0 ? formatINR(b.visitFee) : "—"}</dd></div>
              {b.taxAmount > 0 && <div className="flex justify-between"><dt className="text-ink-muted">Tax</dt><dd>{formatINR(b.taxAmount)}</dd></div>}
              <div className="flex justify-between pt-1 text-base font-extrabold text-navy-900"><dt>Estimated total</dt><dd>{formatINR(b.estimatedTotal)}</dd></div>
              {b.finalAmount != null && <div className="flex justify-between font-bold text-success-700"><dt>Final amount (recorded)</dt><dd>{formatINR(b.finalAmount)}</dd></div>}
            </dl>
            <p className="mt-3 text-xs text-ink-muted">Estimate only. Parts and additional repair costs may be extra and are confirmed by the technician before work. Payment is collected after service.</p>
          </section>
        </div>

        <div className="space-y-6">
          <section className="card space-y-4 p-5 text-sm">
            <div className="flex gap-3"><CalendarDays className="h-5 w-5 shrink-0 text-brand-700" /><div><p className="font-semibold text-navy-900">{formatDateLabel(b.scheduledDate)}</p><p className="text-ink-muted">{b.slotLabel} (requested)</p></div></div>
            <div className="flex gap-3"><MapPin className="h-5 w-5 shrink-0 text-brand-700" /><p className="text-ink-muted">{b.addressSummary}</p></div>
            <div className="flex gap-3"><User className="h-5 w-5 shrink-0 text-brand-700" /><p className="text-ink-muted">{b.customerName} · {b.mobileMasked}</p></div>
            <div className="flex gap-3"><Clock className="h-5 w-5 shrink-0 text-brand-700" /><p className="text-ink-muted">Booked {formatDateTimeIST(b.createdAt)}</p></div>
          </section>

          <section className="card p-5">
            <h2 className="text-base font-bold">What happens next</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink-muted">
              <li>We review your request and confirm the slot.</li>
              <li>A technician is assigned and contacts you before the visit.</li>
              <li>Inspection first — you approve any repair cost before work.</li>
              <li>Pay after the service is done.</li>
            </ol>
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="text-base font-bold">Need help?</h2>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-success-600 font-semibold text-white hover:bg-success-700">
                <MessageCircle className="h-5 w-5" /> WhatsApp support
              </a>
            )}
            {tel && (
              <a href={tel} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line-strong font-semibold text-navy-900 hover:bg-navy-50">
                <Phone className="h-5 w-5" /> Call {settings.supportPhone}
              </a>
            )}
            {!wa && !tel && <p className="text-sm text-ink-muted">Support contact details will be shown here once configured. <Link href="/support" className="font-semibold text-brand-700 hover:underline">Support page</Link></p>}
            <ButtonLink href={`/booking/${b.code}`} variant="outline" className="w-full">Refresh status</ButtonLink>
            {b.canRequestCancel && <CancelRequest code={b.code} cutoffHours={settings.cancellationCutoffHours} />}
          </section>
        </div>
      </div>

      {b.timeline.length > 1 && (
        <section className="card mt-6 p-5 sm:p-6">
          <h2 className="text-lg font-bold">Updates</h2>
          <ol className="mt-4 space-y-3 border-l-2 border-line pl-5">
            {[...b.timeline].reverse().map((t, i) => (
              <li key={i} className="relative text-sm">
                <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-brand-500 ring-4 ring-white" />
                <p className="font-semibold text-navy-900">{t.message}</p>
                <p className="text-xs text-ink-soft">{formatDateTimeIST(t.at)}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
