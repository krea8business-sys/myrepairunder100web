import { desc } from "drizzle-orm";
import { PageHeader, Panel } from "@/components/admin/ui";
import { db, schema } from "@/db";
import { formatDateTimeIST } from "@/lib/format";
import { requireAdminPage } from "@/server/admin-auth";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireAdminPage("MANAGER");
  const rows = await db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt)).limit(200);
  return (
    <div>
      <PageHeader title="Audit log" description="Latest 200 admin actions." />
      <Panel>
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft"><tr><th className="px-5 py-2">When</th><th className="px-3 py-2">Who</th><th className="px-3 py-2">Action</th><th className="px-5 py-2">Details</th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-5 py-2 text-ink-muted">{formatDateTimeIST(r.createdAt)}</td>
                  <td className="px-3 py-2">{r.adminName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                  <td className="max-w-[420px] truncate px-5 py-2 font-mono text-xs text-ink-muted" title={JSON.stringify(r.details)}>{r.details ? JSON.stringify(r.details) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
