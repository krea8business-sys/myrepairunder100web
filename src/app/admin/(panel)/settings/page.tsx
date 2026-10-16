import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/ui/Badge";
import type { FaqItem } from "@/db/schema";
import { requireAdminPage } from "@/server/admin-auth";
import { integrationStatus } from "@/server/integrations/status";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdminPage("OWNER");
  const s = await getSettings();
  const { id: _id, updatedAt: _u, workingDays: _w, bookingWindowDays: _b, minLeadMinutes: _m, asapEnabled: _a, asapCutoff: _c, asapDailyCapacity: _d, onlinePaymentEnabled: _o, ...editable } = s;
  return (
    <div>
      <PageHeader title="Settings" description="Business details, contact, fees, tax, policies and content. Changes go live immediately." />
      <SettingsForm initial={{ ...editable, faqs: (s.faqs as FaqItem[]) ?? [] }} />
      <Panel title="Integrations" className="mt-6">
        <p className="mb-3 text-sm text-ink-muted">Integrations are enabled with environment variables on the server (never in this dashboard) so secrets stay out of the database and browser. Unconfigured channels are skipped and logged — the site never claims a message or payment happened.</p>
        <ul className="divide-y divide-line text-sm">
          {integrationStatus().map((i) => (
            <li key={i.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <span><strong>{i.name}</strong><span className="block font-mono text-xs text-ink-soft">{i.env.join(", ")}</span>{i.note && <span className="block text-xs text-amber-700">{i.note}</span>}</span>
              {i.configured ? <Badge tone="green">Configured</Badge> : <Badge tone="slate">Not configured</Badge>}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
