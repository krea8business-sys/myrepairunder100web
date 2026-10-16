"use client";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import type { Category } from "@/db/schema";
import { slugify } from "@/lib/format";
import { ImageUpload } from "./ImageUpload";
import { labelClass, PageHeader, Panel, selectClass, smallInput } from "./ui";
import { useApi } from "./useApi";

export function CategoryForm({ category }: { category: Category | null }) {
  const isNew = !category;
  const [f, setF] = useState({
    name: category?.name ?? "",
    shortName: category?.shortName ?? "",
    slug: category?.slug ?? "",
    tagline: category?.tagline ?? "",
    description: category?.description ?? "",
    longDescription: category?.longDescription ?? "",
    imageUrl: category?.imageUrl ?? null,
    illustration: category?.illustration ?? "generic",
    sortOrder: category?.sortOrder?.toString() ?? "0",
    active: category?.active ?? true,
    archived: category?.archived ?? false,
    seoTitle: category?.seoTitle ?? "",
    seoDescription: category?.seoDescription ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDel, setConfirmDel] = useState(false);
  const { call, pending } = useApi();
  const router = useRouter();
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>;

  async function save() {
    const body = { ...f, sortOrder: Number(f.sortOrder) || 0, seoTitle: f.seoTitle || null, seoDescription: f.seoDescription || null };
    const r = isNew ? await call<{ id: string }>("POST", "/api/admin/categories", body, { success: "Category created", refresh: false }) : await call("PATCH", `/api/admin/categories/${category!.id}`, body, { success: "Category saved" });
    if (!r.ok) setErrors(r.fields ?? {});
    else if (isNew) router.replace("/admin/catalogue");
  }

  return (
    <div className="max-w-3xl">
      <Link href="/admin/catalogue" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" /> Services & prices</Link>
      <PageHeader title={isNew ? "New category" : f.name} actions={!isNew && <Button variant="outline" size="sm" className="border-red-200 text-red-600" onClick={() => setConfirmDel(true)}><Trash2 className="h-4 w-4" /> Delete / archive</Button>} />
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <label><span className={labelClass}>Name</span><input className={smallInput} value={f.name} onChange={(e) => { set("name", e.target.value); if (isNew) set("slug", slugify(e.target.value)); }} />{err("name")}</label>
          <label><span className={labelClass}>Short name</span><input className={smallInput} value={f.shortName} onChange={(e) => set("shortName", e.target.value)} placeholder="e.g. AC" />{err("shortName")}</label>
          <label><span className={labelClass}>URL slug</span><input className={smallInput} value={f.slug} onChange={(e) => set("slug", slugify(e.target.value))} />{err("slug")}</label>
          <label><span className={labelClass}>Illustration (fallback)</span>
            <select className={`${selectClass} w-full`} value={f.illustration} onChange={(e) => set("illustration", e.target.value)}>
              {["ac", "washer", "fridge", "microwave", "generic"].map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2"><span className={labelClass}>Tagline</span><input className={smallInput} value={f.tagline} onChange={(e) => set("tagline", e.target.value)} /></label>
          <label className="sm:col-span-2"><span className={labelClass}>Card description</span><textarea className={`${smallInput} h-20 py-2`} value={f.description} onChange={(e) => set("description", e.target.value)} /></label>
          <label className="sm:col-span-2"><span className={labelClass}>Category page description</span><textarea className={`${smallInput} h-32 py-2`} value={f.longDescription} onChange={(e) => set("longDescription", e.target.value)} /></label>
          <div className="sm:col-span-2"><ImageUpload value={f.imageUrl} onChange={(v) => set("imageUrl", v)} label="Banner image" /></div>
          <label><span className={labelClass}>SEO title</span><input className={smallInput} value={f.seoTitle} maxLength={70} onChange={(e) => set("seoTitle", e.target.value)} /></label>
          <label><span className={labelClass}>SEO description</span><input className={smallInput} value={f.seoDescription} maxLength={170} onChange={(e) => set("seoDescription", e.target.value)} /></label>
          <label><span className={labelClass}>Sort order</span><input inputMode="numeric" className={smallInput} value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value.replace(/\D/g, ""))} /></label>
          <div className="flex items-end gap-6 pb-2 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /> Active</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={f.archived} onChange={(e) => set("archived", e.target.checked)} /> Archived</label>
          </div>
        </div>
        <Button className="mt-6" onClick={save} loading={pending}>{isNew ? "Create category" : "Save changes"}</Button>
      </Panel>
      <ConfirmDialog
        open={confirmDel}
        onCancel={() => setConfirmDel(false)}
        danger
        loading={pending}
        title="Delete this category?"
        body="Categories that still contain services are archived (hidden) instead of deleted."
        confirmLabel="Delete / archive"
        onConfirm={async () => {
          const r = await call("DELETE", `/api/admin/categories/${category!.id}`, undefined, { success: "Done", refresh: false });
          if (r.ok) router.replace("/admin/catalogue");
        }}
      />
    </div>
  );
}
