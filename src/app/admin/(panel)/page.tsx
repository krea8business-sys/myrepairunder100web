import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdminPage } from "@/server/admin-auth";
import { bookingStats, listBookings } from "@/server/admin-queries";
import { getSettings } from "@/server/settings";
import { integrationStatus } from "@/server/integrations/status";

export const metadata = { title: "Overview" };

export default async function AdminOverview({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const admin = await requireAdminPage();
  const { denied } = await searchParams;
  const [stats, recent, settings] = await Promise.all([bookingStats(), listBookings({ page: 1 }), getSettings()]);
  const cards = [
    { label: "Total bookings", value: stats.total, href: "/admin/bookings" },
    { label: "New (24h)", value: stats.newLast24h, href: "/admin/bookings" },
    { label: "Received", value: stats.by.RECEIVED ?? 0, href: "/admin/bookings?status=RECEIVED", tone: "text-brand-700" },
    { label: "Pending confirmation", value: stats.by.PENDING_CONFIRMATION ?? 0, href: "/admin/bookings?status=PENDING_CONFIRMATION", tone: "text-amber-700" },
    { label: "Confirmed / assigned", value: (stats.by.CONFIRMED ?? 0) + (stats.by.TECHNICIAN_ASSIGNED ?? 0), href: "/admin/bookings?status=CONFIRMED", tone: "text-indigo-700" },
    { label: "Completed", value: stats.by.COMPLETED ?? 0, href: "/admin/bookings?status=COMPLETED", tone: "text-success-700" },
    { label: "Cancelled", value: stats.by.CANCELLED ?? 0, href: "/admin/bookings?status=CANCELLED", tone: "text-red-700" },
    { label: "Cancellation requests", value: stats.cancelRequests, href: "/admin/bookings?cancel=1", tone: "text-red-700" },
  ];
  const setupGaps = [
    !settings.supportPhone && !settings.whatsappNumber && "Add a support phone or WhatsApp number (Settings)",
    settings.showDemoBanner && "Turn off the preview banner when ready (Settings)",
    settings.visitFeeIsDemo && "Confirm visit/inspection fee (Settings)",
  ].filter(Boolean) as string[];
  const unconfigured = integrationStatus().filter((i) => !i.configured).length;

  return (
    <div>
      <PageHeader title={`Hello, ${admin.name.split(" ")[0]}`} description="Bookings at a glance." />
      {denied && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">You don&apos;t have permission to open that page.</p>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="rounded-2xl border border-line bg-white p-4 shadow-sm hover:border-navy-300">
            <p className="text-xs font-semibold text-ink-muted">{c.label}</p>
            <p className={`mt-1 text-3xl font-extrabold ${c.tone ?? "text-navy-900"}`}>{c.value}</p>
          </Link>
        ))}
      </div>
      {admin.role === "OWNER" && (setupGaps.length > 0 || unconfigured > 0) && (
        <Panel className="mt-6" title="Setup checklist">
          <ul className="space-y-2 text-sm">
            {setupGaps.map((g) => <li key={g} className="flex gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> {g}</li>)}
            {unconfigured > 0 && <li className="flex gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> {unconfigured} integrations are not configured — see Settings → Integrations.</li>}
          </ul>
        </Panel>
      )}
      <Panel className="mt-6" title="Recent bookings" actions={<Link href="/admin/bookings" className="text-sm font-semibold text-brand-700 hover:underline">View all</Link>}>
        <BookingsTable rows={recent.rows.slice(0, 10)} />
      </Panel>
    </div>
  );
}
