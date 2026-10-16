import { desc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Panel } from "@/components/admin/ui";
import { StatusBadge } from "@/components/ui/Badge";
import { db, schema } from "@/db";
import { formatDateLabel, formatDateTimeIST } from "@/lib/format";
import { requireAdminPage } from "@/server/admin-auth";

export const metadata = { title: "Technician" };

export default async function TechnicianDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage("MANAGER");
  const { id } = await params;
  const t = (await db.select().from(schema.technicians).where(eq(schema.technicians.id, id)).limit(1))[0];
  if (!t) notFound();
  const [current, history] = await Promise.all([
    db.select().from(schema.bookings).where(eq(schema.bookings.technicianId, id)).orderBy(desc(schema.bookings.scheduledDate)).limit(100),
    db
      .select({ a: schema.technicianAssignments, code: schema.bookings.code, bookingId: schema.bookings.id })
      .from(schema.technicianAssignments)
      .innerJoin(schema.bookings, eq(schema.technicianAssignments.bookingId, schema.bookings.id))
      .where(eq(schema.technicianAssignments.technicianId, id))
      .orderBy(desc(schema.technicianAssignments.assignedAt))
      .limit(100),
  ]);
  return (
    <div>
      <Link href="/admin/technicians" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" /> Technicians</Link>
      <PageHeader title={t.name} description={`${t.phone}${t.email ? ` · ${t.email}` : ""} · ${t.active ? "Active" : "Inactive"}`} />
      {t.notes && <p className="mb-4 rounded-xl bg-navy-50 p-3 text-sm">{t.notes}</p>}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Assigned bookings">
          <ul className="divide-y divide-line text-sm">
            {current.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 py-2">
                <span><Link href={`/admin/bookings/${b.id}`} className="font-mono font-bold text-brand-700">{b.code}</Link> · {formatDateLabel(b.scheduledDate, { withYear: false })} · {b.slotLabel}</span>
                <StatusBadge status={b.status} />
              </li>
            ))}
            {current.length === 0 && <li className="py-2 text-ink-muted">No bookings assigned.</li>}
          </ul>
        </Panel>
        <Panel title="Assignment history">
          <ul className="divide-y divide-line text-sm">
            {history.map(({ a, code, bookingId }) => (
              <li key={a.id} className="py-2"><Link href={`/admin/bookings/${bookingId}`} className="font-mono font-bold text-brand-700">{code}</Link> — assigned {formatDateTimeIST(a.assignedAt)} by {a.assignedBy}{a.unassignedAt ? `, removed ${formatDateTimeIST(a.unassignedAt)}` : ""}</li>
            ))}
            {history.length === 0 && <li className="py-2 text-ink-muted">No history yet.</li>}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
