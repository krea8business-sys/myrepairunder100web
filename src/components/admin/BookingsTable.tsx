import Link from "next/link";
import { StatusBadge } from "@/components/ui/Badge";
import type { Booking } from "@/db/schema";
import { formatDateLabel, formatDateTimeIST, formatINR } from "@/lib/format";

type Row = { b: Booking; tech: string | null; services: string | null };

export function BookingsTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return <p className="py-10 text-center text-sm text-ink-muted">No bookings found.</p>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-line text-xs uppercase tracking-wider text-ink-soft">
          <tr>
            <th className="px-5 py-2.5">Booking</th>
            <th className="px-3 py-2.5">Customer</th>
            <th className="px-3 py-2.5">Services</th>
            <th className="px-3 py-2.5">Requested slot</th>
            <th className="px-3 py-2.5">Status</th>
            <th className="px-3 py-2.5">Technician</th>
            <th className="px-5 py-2.5 text-right">Est.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map(({ b, tech, services }) => (
            <tr key={b.id} className="hover:bg-navy-50/50">
              <td className="px-5 py-3">
                <Link href={`/admin/bookings/${b.id}`} className="font-mono font-bold text-brand-700 hover:underline" data-testid="admin-booking-link">{b.code}</Link>
                <p className="text-xs text-ink-soft">{formatDateTimeIST(b.createdAt)}</p>
              </td>
              <td className="px-3 py-3">
                <p className="font-semibold">{b.customerName}</p>
                <p className="text-xs text-ink-muted">{b.customerMobile} · {b.pincode}</p>
              </td>
              <td className="max-w-[220px] px-3 py-3"><p className="line-clamp-2 text-ink-muted">{services}</p></td>
              <td className="px-3 py-3">
                <p>{formatDateLabel(b.scheduledDate, { withYear: false })}</p>
                <p className="text-xs text-ink-muted">{b.slotLabel}</p>
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={b.status} />
                {b.cancelRequested && <p className="mt-1 text-xs font-semibold text-red-600">Cancel requested</p>}
              </td>
              <td className="px-3 py-3 text-ink-muted">{tech ?? "—"}</td>
              <td className="px-5 py-3 text-right font-semibold">{formatINR(b.finalAmount ?? b.estimatedTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
