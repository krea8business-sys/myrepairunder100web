"use client";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import type { Service } from "@/db/schema";
import { slugify } from "@/lib/format";
import { ImageUpload } from "./ImageUpload";
import { labelClass, PageHeader, Panel, selectClass, smallInput } from "./ui";
import { useApi } from "./useApi";

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export function ServiceForm({ service, categories, defaultCategoryId }: { service: Service | null; categories: { id: string; name: string; slug: string }[]; defaultCategoryId?: string }) {
  const isNew = !service;
  const [f, setF] = useState({
    categoryId: service?.categoryId ?? defaultCategoryId ?? "",
    name: service?.name ?? "",
    slug: service?.slug ?? "",
    shortDescription: service?.shortDescription ?? "",
    description: service?.description ?? "",
    imageUrl: service?.imageUrl ?? null,
    priceType: service?.priceType ?? "FIXED",
    price: service?.price?.toString() ?? "",
    priceIsDemo: service?.priceIsDemo ?? false,
    inclusions: (service?.inclusions ?? []).join("\n"),
    exclusions: (service?.exclusions ?? ["Spare parts and consumables"]).join("\n"),
    partsExtra: service?.partsExtra ?? true,
    requiresDiagnosis: service?.requiresDiagnosis ?? false,
    durationMinutes: service?.durationMinutes?.toString() ?? "",
    warrantyDays: service?.warrantyDays?.toString() ?? "",
    warrantyNote: service?.warrantyNote ?? "",
    allowQuantity: service?.allowQuantity ?? true,
    maxQuantity: service?.maxQuantity?.toString() ?? "5",
    popular: service?.popular ?? false,
    active: service?.active ?? true,
    sortOrder: service?.sortOrder?.toString() ?? "0",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const { call, pending } = useApi();
  const router = useRouter();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>;

  async function save() {
    const body = {
      ...f,
      price: f.priceType === "QUOTE" ? null : num(f.price),
      inclusions: f.inclusions.split("\n").map((s) => s.trim()).filter(Boolean),
      exclusions: f.exclusions.split("\n").map((s) => s.trim()).filter(Boolean),
      durationMinutes: num(f.durationMinutes),
      warrantyDays: num(f.warrantyDays),
      warrantyNote: f.warrantyNote || null,
      maxQuantity: Number(f.maxQuantity) || 1,
      sortOrder: Number(f.sortOrder) || 0,
    };
    const r = isNew ? await call<{ id: string }>("POST", "/api/admin/services", body, { success: "Service created", refresh: false }) : await call("PATCH", `/api/admin/services/${service!.id}`, body, { success: "Service saved" });
    if (!r.ok) setErrors(r.fields ?? {});
    else {
      setErrors({});
      if (isNew) router.replace(`/admin/catalogue/services/${(r.data as { id: string }).id}`);
    }
  }

  const cat = categories.find((c) => c.id === f.categoryId);
  return (
    <div className="max-w-4xl">
      <Link href="/admin/catalogue" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" /> Services & prices</Link>
      <PageHeader
        title={isNew ? "New service" : f.name || "Edit service"}
        description={!isNew && cat ? <a href={`/services/${cat.slug}/${service!.slug}`} target="_blank" className="text-brand-700 hover:underline">View on website ↗</a> : undefined}
        actions={!isNew && <Button variant="outline" size="sm" className="border-red-200 text-red-600" onClick={() => setConfirmDel(true)}><Trash2 className="h-4 w-4" /> Delete / archive</Button>}
      />
      <div className="space-y-6">
        <Panel title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Category</span><select className={`${selectClass} w-full`} value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label><span className={labelClass}>Name</span><input className={smallInput} value={f.name} onChange={(e) => { set("name", e.target.value); if (isNew) set("slug", slugify(e.target.value)); }} />{err("name")}</label>
            <label><span className={labelClass}>URL slug</span><input className={smallInput} value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} />{err("slug")}</label>
            <label><span className={labelClass}>Sort order</span><input inputMode="numeric" className={smallInput} value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value.replace(/\D/g, ""))} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>Short description (cards)</span><input className={smallInput} value={f.shortDescription} maxLength={200} onChange={(e) => set("shortDescription", e.target.value)} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>Full description</span><textarea className={`${smallInput} h-28 py-2`} value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
            <div className="sm:col-span-2"><ImageUpload value={f.imageUrl} onChange={(v) => set("imageUrl", v)} /></div>
          </div>
        </Panel>

        <Panel title="Pricing">
          <div className="grid gap-4 sm:grid-cols-3">
            <label><span className={labelClass}>Price type</span>
              <select className={`${selectClass} w-full`} value={f.priceType} onChange={(e) => set("priceType", e.target.value as typeof f.priceType)}>
                <option value="FIXED">Fixed price</option>
                <option value="STARTING">Starting price (“Starts at”)</option>
                <option value="INSPECTION">Inspection / diagnosis fee</option>
                <option value="QUOTE">Price to be confirmed</option>
              </select>
            </label>
            <label><span className={labelClass}>Price (₹)</span><input inputMode="numeric" className={smallInput} disabled={f.priceType === "QUOTE"} value={f.priceType === "QUOTE" ? "" : f.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} />{err("price")}</label>
            <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={f.priceIsDemo} onChange={(e) => set("priceIsDemo", e.target.checked)} /> Show “Demo price” label</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.partsExtra} onChange={(e) => set("partsExtra", e.target.checked)} /> Spare parts charged extra</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.requiresDiagnosis} onChange={(e) => set("requiresDiagnosis", e.target.checked)} /> Final price after diagnosis</label>
          </div>
        </Panel>

        <Panel title="Inclusions & exclusions">
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>What&apos;s included (one per line)</span><textarea className={`${smallInput} h-36 py-2`} value={f.inclusions} onChange={(e) => set("inclusions", e.target.value)} /></label>
            <label><span className={labelClass}>Not included (one per line)</span><textarea className={`${smallInput} h-36 py-2`} value={f.exclusions} onChange={(e) => set("exclusions", e.target.value)} /></label>
          </div>
        </Panel>

        <Panel title="Details & availability">
          <div className="grid gap-4 sm:grid-cols-3">
            <label><span className={labelClass}>Duration (minutes)</span><input inputMode="numeric" className={smallInput} value={f.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value.replace(/\D/g, ""))} />{err("durationMinutes")}</label>
            <label><span className={labelClass}>Warranty (days)</span><input inputMode="numeric" className={smallInput} value={f.warrantyDays} onChange={(e) => set("warrantyDays", e.target.value.replace(/\D/g, ""))} /></label>
            <label><span className={labelClass}>Warranty note</span><input className={smallInput} value={f.warrantyNote} onChange={(e) => set("warrantyNote", e.target.value)} placeholder="e.g. 30 days on labour" /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.allowQuantity} onChange={(e) => set("allowQuantity", e.target.checked)} /> Allow quantity &gt; 1</label>
            <label><span className={labelClass}>Max quantity</span><input inputMode="numeric" className={smallInput} disabled={!f.allowQuantity} value={f.maxQuantity} onChange={(e) => set("maxQuantity", e.target.value.replace(/\D/g, ""))} /></label>
            <div />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Active (bookable)</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.popular} onChange={(e) => set("popular", e.target.checked)} /> Show in Popular</label>
          </div>
        </Panel>

        <div className="sticky bottom-0 -mx-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
          <Button onClick={save} loading={pending} data-testid="save-service">{isNew ? "Create service" : "Save changes"}</Button>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDel}
        onCancel={() => setConfirmDel(false)}
        danger
        loading={pending}
        title="Delete this service?"
        body="Services that appear in past bookings are archived instead of deleted, so booking history stays intact. Archived services are hidden from customers."
        confirmLabel="Delete / archive"
        onConfirm={async () => {
          const r = await call("DELETE", `/api/admin/services/${service!.id}`, undefined, { success: "Done", refresh: false });
          if (r.ok) router.replace("/admin/catalogue");
        }}
      />
    </div>
  );
}
