import { Download } from "lucide-react";
import Link from "next/link";
import { BookingFilters } from "@/components/admin/BookingFilters";
import { BookingsTable } from "@/components/admin/BookingsTable";
import { PageHeader, Panel } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/Button";
import { requireAdminPage } from "@/server/admin-auth";
import { listBookings, PAGE_SIZE, parseFilters } from "@/server/admin-queries";
import { getCatalogue } from "@/server/catalogue";
import { hasRole } from "@/server/admin-session";

export const metadata = { title: "Bookings" };

export default async function AdminBookings({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const admin = await requireAdminPage();
  const sp = await searchParams;
  const f = parseFilters(sp);
  const [{ rows, total }, catalogue] = await Promise.all([listBookings(f), getCatalogue()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (p: number) => {
    const u = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
    u.set("page", String(p));
    return `?${u.toString()}`;
  };
  const exportQs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => typeof v === "string" && k !== "page") as [string, string][]).toString();
  return (
    <div>
      <PageHeader
        title="Bookings"
        description={`${total} booking${total === 1 ? "" : "s"} match`}
        actions={hasRole(admin.role, "MANAGER") ? <a href={`/api/admin/bookings/export?${exportQs}`} className={buttonClass("outline", "sm")}><Download className="h-4 w-4" /> Export CSV</a> : undefined}
      />
      <BookingFilters categories={catalogue.map((c) => ({ id: c.id, name: c.name }))} />
      <Panel className="mt-4">
        <BookingsTable rows={rows} />
        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-ink-muted">Page {f.page} of {pages}</span>
            <div className="flex gap-2">
              {f.page! > 1 && <Link href={qs(f.page! - 1)} className={buttonClass("outline", "sm")}>Previous</Link>}
              {f.page! < pages && <Link href={qs(f.page! + 1)} className={buttonClass("outline", "sm")}>Next</Link>}
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
