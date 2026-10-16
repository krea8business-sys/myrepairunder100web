import { asc, desc, eq } from "drizzle-orm";
import { ArrowLeft, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingActions } from "@/components/admin/BookingActions";
import { Panel } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/Badge";
import { db, schema } from "@/db";
import { formatDateLabel, formatDateTimeIST, formatINR, whatsappLink } from "@/lib/format";
import { allowedTransitions, PAYMENT_STATUS_LABEL } from "@/lib/status";
import { requireAdminPage } from "@/server/admin-auth";

export const metadata = { title: "Booking" };

export default async function AdminBookingDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const b = (await db.select().from(schema.bookings).where(eq(schema.bookings.id, id)).limit(1))[0];
  if (!b) notFound();
  const [items, events, techs, skills, assignments, slots, notes] = await Promise.all([
    db.select().from(schema.bookingItems).where(eq(schema.bookingItems.bookingId, id)),
    db.select().from(schema.bookingEvents).where(eq(schema.bookingEvents.bookingId, id)).orderBy(desc(schema.bookingEvents.createdAt)),
    db.select().from(schema.technicians).where(eq(schema.technicians.active, true)).orderBy(asc(schema.technicians.name)),
    db.select().from(schema.technicianSkills),
    db
      .select({ a: schema.technicianAssignments, name: schema.technicians.name })
      .from(schema.technicianAssignments)
      .innerJoin(schema.technicians, eq(schema.technicianAssignments.technicianId, schema.technicians.id))
      .where(eq(schema.technicianAssignments.bookingId, id))
      .orderBy(desc(schema.technicianAssignments.assignedAt)),
    db.select().from(schema.timeSlots).orderBy(asc(schema.timeSlots.sortOrder)),
    db.select().from(schema.notificationLogs).where(eq(schema.notificationLogs.bookingId, id)).orderBy(desc(schema.notificationLogs.createdAt)).limit(20),
  ]);
  const cats = new Set(items.map((i) => i.categoryId));
  const techOptions = techs.map((t) => {
    const tSkills = skills.filter((s) => s.technicianId === t.id).map((s) => s.categoryId);
    const skillMatch = [...cats].every((c) => tSkills.includes(c));
    const areaMatch = t.pincodes.length === 0 || t.pincodes.includes(b.pincode);
    return { id: t.id, name: t.name, match: skillMatch && areaMatch, hint: [skillMatch ? null : "skills don't cover all services", areaMatch ? null : "outside pincodes"].filter(Boolean).join(", ") };
  });
  const current = assignments.find((a) => !a.a.unassignedAt);
  const wa = whatsappLink(b.customerMobile, `Hi ${b.customerName}, this is about your booking ${b.code}.`);

  return (
    <div>
      <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" /> Bookings</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-extrabold">{b.code}</h1>
        <StatusBadge status={b.status} className="text-sm" />
        {b.cancelRequested && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold text-red-700 ring-1 ring-red-200">Cancellation requested</span>}
      </div>
      <p className="mt-1 text-sm text-ink-muted">Created {formatDateTimeIST(b.createdAt)} · source: {b.source}</p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Customer">
              <p className="font-semibold">{b.customerName}</p>
              <p className="text-sm">{b.customerMobile}{b.customerEmail ? ` · ${b.customerEmail}` : ""}</p>
              <div className="mt-3 flex gap-2">
                <a href={`tel:+91${b.customerMobile}`} className="inline-flex items-center gap-1 rounded-lg bg-navy-50 px-3 py-1.5 text-sm font-semibold text-navy-800 hover:bg-navy-100"><Phone className="h-4 w-4" /> Call</a>
                {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-success-50 px-3 py-1.5 text-sm font-semibold text-success-700 hover:bg-success-100"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
              </div>
            </Panel>
            <Panel title="Address & slot">
              <p className="text-sm">{[b.houseNo, b.street, b.landmark && `Near ${b.landmark}`].filter(Boolean).join(", ")}</p>
              <p className="text-sm">{b.city}, {b.state} – <strong>{b.pincode}</strong> ({b.addressType.toLowerCase()}){b.areaLocality ? ` · area: ${b.areaLocality}` : ""}</p>
              {b.latitude != null && b.longitude != null && (
                <a href={`https://www.google.com/maps?q=${b.latitude},${b.longitude}`} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"><MapPin className="h-4 w-4" /> Customer-shared location</a>
              )}
              {b.instructions && <p className="mt-2 rounded-lg bg-navy-50 p-2 text-sm">“{b.instructions}”</p>}
              <p className="mt-3 text-sm font-semibold">{formatDateLabel(b.scheduledDate)} · {b.slotLabel}</p>
            </Panel>
          </div>

          <Panel title="Services & charges">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-line">
                {items.map((i) => (
                  <tr key={i.id}>
                    <td className="py-2">{i.serviceName}{i.quantity > 1 && ` × ${i.quantity}`}<span className="block text-xs text-ink-soft">{i.categoryName} · {i.priceType.toLowerCase()}{i.unitPrice != null ? ` @ ${formatINR(i.unitPrice)}` : ""}</span></td>
                    <td className="py-2 text-right font-semibold">{i.priceType === "QUOTE" ? "TBC" : formatINR(i.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 border-t border-line pt-3 text-sm sm:grid-cols-4">
              <dt className="text-ink-muted">Subtotal</dt><dd>{formatINR(b.subtotal)}</dd>
              <dt className="text-ink-muted">Visit fee</dt><dd>{formatINR(b.visitFee)}</dd>
              <dt className="text-ink-muted">Tax</dt><dd>{formatINR(b.taxAmount)}</dd>
              <dt className="font-bold">Estimate</dt><dd className="font-bold">{formatINR(b.estimatedTotal)}</dd>
              <dt className="text-ink-muted">Final recorded</dt><dd className="font-bold text-success-700">{b.finalAmount != null ? formatINR(b.finalAmount) : "—"}</dd>
              <dt className="text-ink-muted">Payment</dt><dd>{PAYMENT_STATUS_LABEL[b.paymentStatus]}</dd>
            </dl>
            {b.customerNote && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm"><strong>Customer note:</strong> {b.customerNote}</p>}
            {b.cancelReason && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm"><strong>Cancellation reason (customer):</strong> {b.cancelReason}</p>}
          </Panel>

          <Panel title="Activity & audit trail">
            <ol className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.internal ? "bg-slate-400" : "bg-brand-500"}`} />
                  <div>
                    <p><span className="font-semibold">{e.message}</span> {e.internal && <span className="ml-1 rounded bg-slate-100 px-1.5 text-[10px] font-bold uppercase text-slate-600">internal</span>}</p>
                    <p className="text-xs text-ink-soft">{e.type.replace("_", " ").toLowerCase()} · {e.actor} · {formatDateTimeIST(e.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <div className="grid gap-6 md:grid-cols-2">
            <Panel title="Assignment history">
              {assignments.length === 0 ? <p className="text-sm text-ink-muted">Not assigned yet.</p> : (
                <ul className="space-y-2 text-sm">
                  {assignments.map(({ a, name }) => (
                    <li key={a.id}><strong>{name}</strong> — {formatDateTimeIST(a.assignedAt)}{a.unassignedAt ? ` → ${formatDateTimeIST(a.unassignedAt)}` : " (current)"} <span className="text-xs text-ink-soft">by {a.assignedBy}</span></li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Notifications">
              {notes.length === 0 ? <p className="text-sm text-ink-muted">None attempted.</p> : (
                <ul className="space-y-1 text-sm">
                  {notes.map((n) => <li key={n.id}><span className="font-semibold">{n.channel}</span> · {n.event} · <span className={n.status === "sent" ? "text-success-700" : n.status === "failed" ? "text-red-600" : "text-ink-soft"}>{n.status}</span>{n.detail ? ` (${n.detail})` : ""}</li>)}
                </ul>
              )}
            </Panel>
          </div>
        </div>

        <BookingActions
          booking={{
            id: b.id, status: b.status, technicianId: current?.a.technicianId ?? b.technicianId, cancelRequested: b.cancelRequested,
            scheduledDate: b.scheduledDate, slotId: b.slotId, isAsap: b.isAsap,
            serviceCharges: b.serviceCharges, partsCharges: b.partsCharges, extraCharges: b.extraCharges,
            paymentStatus: b.paymentStatus, paymentMethod: b.paymentMethod, paymentReference: b.paymentReference,
          }}
          transitions={allowedTransitions(b.status)}
          technicians={techOptions}
          slots={slots.map((s) => ({ id: s.id, label: s.label, active: s.active }))}
        />
      </div>
    </div>
  );
}
