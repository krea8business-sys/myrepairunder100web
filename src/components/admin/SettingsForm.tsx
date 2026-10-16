"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { FaqItem } from "@/db/schema";
import { ImageUpload } from "./ImageUpload";
import { labelClass, Panel, smallInput } from "./ui";
import { useApi } from "./useApi";

type S = {
  businessName: string; tagline: string; logoUrl: string | null; supportPhone: string | null; whatsappNumber: string | null; contactEmail: string | null; businessAddress: string | null; supportHours: string | null;
  visitFee: number; visitFeeLabel: string; visitFeeWaiverAbove: number | null; visitFeeIsDemo: boolean; taxEnabled: boolean; taxPercent: number; taxLabel: string; pricesIncludeTax: boolean;
  allowCancellationRequest: boolean; cancellationCutoffHours: number; servicePolicy: string; cancellationPolicy: string; warrantyPolicy: string; privacyPolicy: string; termsOfService: string;
  paymentMethods: string[]; faqs: FaqItem[]; announcement: string | null; showDemoBanner: boolean;
  notifyCustomerSms: boolean; notifyCustomerWhatsapp: boolean; notifyCustomerEmail: boolean; notifyAdminEmail: boolean; notifyWebhook: boolean;
};

export function SettingsForm({ initial }: { initial: S }) {
  const [s, setS] = useState<S>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { call, pending } = useApi();
  const set = <K extends keyof S>(k: K, v: S[K]) => setS((x) => ({ ...x, [k]: v }));
  const text = (k: keyof S, label: string, opts: { placeholder?: string; type?: string } = {}) => (
    <label>
      <span className={labelClass}>{label}</span>
      <input className={smallInput} type={opts.type ?? "text"} placeholder={opts.placeholder} value={(s[k] as string | null) ?? ""} onChange={(e) => set(k, (e.target.value || null) as S[typeof k])} />
      {errors[k] && <span className="text-xs text-red-600">{errors[k]}</span>}
    </label>
  );
  const int = (k: keyof S, label: string, nullable = false) => (
    <label>
      <span className={labelClass}>{label}</span>
      <input inputMode="decimal" className={smallInput} value={(s[k] as number | null) ?? ""} onChange={(e) => { const v = e.target.value.replace(/[^\d.]/g, ""); set(k, (v === "" ? (nullable ? null : 0) : Number(v)) as S[typeof k]); }} />
      {errors[k] && <span className="text-xs text-red-600">{errors[k]}</span>}
    </label>
  );
  const check = (k: keyof S, label: string) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(s[k])} onChange={(e) => set(k, e.target.checked as S[typeof k])} /> {label}</label>
  );
  const area = (k: keyof S, label: string) => (
    <label className="block"><span className={labelClass}>{label}</span><textarea className={`${smallInput} h-36 py-2`} value={s[k] as string} onChange={(e) => set(k, e.target.value as S[typeof k])} /></label>
  );

  async function save() {
    const r = await call("PATCH", "/api/admin/settings", { ...s, businessName: s.businessName || "", tagline: s.tagline || "" }, { success: "Settings saved" });
    setErrors(r.ok ? {} : (r.fields ?? {}));
  }

  return (
    <div className="space-y-6">
      <Panel title="Business & branding">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("businessName", "Business name")}
          {text("tagline", "Tagline")}
          <div className="sm:col-span-2"><ImageUpload value={s.logoUrl} onChange={(v) => set("logoUrl", v)} label="Logo icon (replaces the orange technician mark)" /></div>
          {text("announcement", "Site announcement banner (optional)")}
          <div className="flex items-end pb-2">{check("showDemoBanner", "Show “preview mode” banner")}</div>
        </div>
      </Panel>
      <Panel title="Contact & support (shown on the website)">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("supportPhone", "Support phone", { placeholder: "+91 XXXXX XXXXX" })}
          {text("whatsappNumber", "WhatsApp number", { placeholder: "+91 XXXXX XXXXX" })}
          {text("contactEmail", "Contact email", { type: "email" })}
          {text("supportHours", "Support hours")}
          <div className="sm:col-span-2">{text("businessAddress", "Business address (optional, used in structured data)")}</div>
        </div>
      </Panel>
      <Panel title="Fees & tax">
        <div className="grid gap-4 sm:grid-cols-3">
          {int("visitFee", "Visit / inspection fee per booking (₹)")}
          {text("visitFeeLabel", "Fee label")}
          {int("visitFeeWaiverAbove", "Waive fee above fixed-price subtotal (₹, blank = never)", true)}
          {check("visitFeeIsDemo", "Mark fee as demo")}
          <div />
          <div />
          {check("taxEnabled", "Show tax")}
          {int("taxPercent", "Tax %")}
          {text("taxLabel", "Tax label")}
          {check("pricesIncludeTax", "Prices already include tax")}
        </div>
      </Panel>
      <Panel title="Cancellation & payments">
        <div className="grid gap-4 sm:grid-cols-3">
          {check("allowCancellationRequest", "Allow online cancellation requests")}
          {int("cancellationCutoffHours", "Cutoff before slot (hours)")}
          <div />
          <label className="sm:col-span-3"><span className={labelClass}>Payment methods shown (one per line)</span><textarea className={`${smallInput} h-20 py-2`} value={s.paymentMethods.join("\n")} onChange={(e) => set("paymentMethods", e.target.value.split("\n").map((x) => x.trim()).filter(Boolean))} /></label>
        </div>
        <p className="mt-2 text-xs text-ink-muted">Online payment is not integrated; customers pay after service.</p>
      </Panel>
      <Panel title="Notifications (sent only when the matching integration is configured)">
        <div className="flex flex-wrap gap-6">
          {check("notifyCustomerSms", "Customer SMS")}
          {check("notifyCustomerWhatsapp", "Customer WhatsApp")}
          {check("notifyCustomerEmail", "Customer email")}
          {check("notifyAdminEmail", "Admin email for new bookings")}
          {check("notifyWebhook", "Webhook (e.g. Google Sheets)")}
        </div>
      </Panel>
      <Panel title="Policies">
        <div className="grid gap-4 lg:grid-cols-2">
          {area("servicePolicy", "Service policy")}
          {area("cancellationPolicy", "Cancellation policy")}
          {area("warrantyPolicy", "Warranty policy")}
          {area("privacyPolicy", "Privacy policy")}
          {area("termsOfService", "Terms of service")}
        </div>
      </Panel>
      <Panel title="FAQs" actions={<Button size="sm" variant="outline" onClick={() => set("faqs", [...s.faqs, { q: "", a: "" }])}><Plus className="h-4 w-4" /> Add FAQ</Button>}>
        <div className="space-y-3">
          {s.faqs.map((f, i) => (
            <div key={i} className="flex gap-2 rounded-xl border border-line p-3">
              <div className="grid flex-1 gap-2">
                <input className={smallInput} placeholder="Question" value={f.q} onChange={(e) => set("faqs", s.faqs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
                <textarea className={`${smallInput} h-20 py-2`} placeholder="Answer" value={f.a} onChange={(e) => set("faqs", s.faqs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
              </div>
              <button className="self-start p-1 text-red-600" aria-label="Remove FAQ" onClick={() => set("faqs", s.faqs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </Panel>
      <div className="sticky bottom-0 z-10 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:rounded-2xl sm:border">
        <Button onClick={save} loading={pending} data-testid="save-settings">Save settings</Button>
        {Object.keys(errors).length > 0 && <span className="ml-3 text-sm text-red-600">Fix the highlighted fields.</span>}
      </div>
    </div>
  );
}
