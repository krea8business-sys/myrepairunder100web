"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import type { ServiceArea } from "@/db/schema";
import { labelClass, Panel, smallInput } from "./ui";
import { useApi } from "./useApi";

type Area = ServiceArea & { categoryIds: string[] };
const blank = { city: "Delhi", state: "Delhi", locality: "", pincode: "", active: true, publishPage: false, pageIntro: "", categoryIds: [] as string[] };

export function AreasManager({ areas, categories }: { areas: Area[]; categories: { id: string; name: string }[] }) {
  const { call, pending } = useApi();
  const [edit, setEdit] = useState<null | { id?: string; v: typeof blank }>(null);
  const [del, setDel] = useState<Area | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "?";

  async function save() {
    if (!edit) return;
    const body = { ...edit.v, pageIntro: edit.v.pageIntro || null };
    const r = edit.id ? await call("PATCH", `/api/admin/areas/${edit.id}`, body, { success: "Area saved" }) : await call("POST", "/api/admin/areas", body, { success: "Area added" });
    if (r.ok) setEdit(null);
    else setErrors(r.fields ?? {});
  }

  return (
    <Panel actions={<Button size="sm" onClick={() => { setErrors({}); setEdit({ v: { ...blank } }); }}><Plus className="h-4 w-4" /> Add area</Button>} title={`${areas.length} areas`}>
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft"><tr><th className="px-5 py-2">Locality</th><th className="px-3 py-2">Pincode</th><th className="px-3 py-2">City / State</th><th className="px-3 py-2">Services</th><th className="px-3 py-2">Status</th><th className="px-5 py-2" /></tr></thead>
          <tbody className="divide-y divide-line">
            {areas.map((a) => (
              <tr key={a.id}>
                <td className="px-5 py-2.5 font-semibold">{a.locality}{a.publishPage && <Badge tone="blue" className="ml-2">page</Badge>}</td>
                <td className="px-3 py-2.5 tabular-nums">{a.pincode}</td>
                <td className="px-3 py-2.5 text-ink-muted">{a.city}, {a.state}</td>
                <td className="px-3 py-2.5 text-ink-muted">{a.categoryIds.length ? a.categoryIds.map(catName).join(", ") : "All"}</td>
                <td className="px-3 py-2.5">
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={a.active} disabled={pending} onChange={(e) => call("PATCH", `/api/admin/areas/${a.id}`, { active: e.target.checked }, { success: e.target.checked ? "Area enabled" : "Area disabled" })} /> Active</label>
                </td>
                <td className="px-5 py-2.5 text-right">
                  <button className="font-semibold text-brand-700 hover:underline" onClick={() => { setErrors({}); setEdit({ id: a.id, v: { city: a.city, state: a.state, locality: a.locality, pincode: a.pincode, active: a.active, publishPage: a.publishPage, pageIntro: a.pageIntro ?? "", categoryIds: a.categoryIds } }); }}>Edit</button>
                  <button className="ml-3 text-red-600" aria-label={`Delete ${a.locality}`} onClick={() => setDel(a)}><Trash2 className="inline h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? "Edit area" : "Add area"} footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} loading={pending}>Save</Button></>}>
        {edit && (
          <div className="grid gap-3 sm:grid-cols-2">
            {(["locality", "pincode", "city", "state"] as const).map((k) => (
              <label key={k}><span className={labelClass}>{k}</span><input className={smallInput} value={edit.v[k]} maxLength={k === "pincode" ? 6 : 80} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, [k]: e.target.value } })} />{errors[k] && <span className="text-xs text-red-600">{errors[k]}</span>}</label>
            ))}
            <fieldset className="sm:col-span-2">
              <legend className={labelClass}>Services available (none = all)</legend>
              <div className="flex flex-wrap gap-3 text-sm text-ink">
                {categories.map((c) => (
                  <label key={c.id} className="flex items-center gap-1.5"><input type="checkbox" checked={edit.v.categoryIds.includes(c.id)} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, categoryIds: e.target.checked ? [...edit.v.categoryIds, c.id] : edit.v.categoryIds.filter((x) => x !== c.id) } })} /> {c.name}</label>
                ))}
              </div>
            </fieldset>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={edit.v.active} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, active: e.target.checked } })} /> Active</label>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={edit.v.publishPage} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, publishPage: e.target.checked } })} /> Publish local landing page</label>
            <label className="sm:col-span-2"><span className={labelClass}>Local page intro (required for the page to appear — write genuinely local information)</span><textarea className={`${smallInput} h-28 py-2`} value={edit.v.pageIntro} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, pageIntro: e.target.value } })} /></label>
          </div>
        )}
      </Modal>
      <ConfirmDialog open={Boolean(del)} onCancel={() => setDel(null)} danger loading={pending} title={`Delete ${del?.locality} (${del?.pincode})?`} body="Customers in this pincode won't be able to book. Existing bookings are not affected. Consider unticking Active instead." confirmLabel="Delete area" onConfirm={async () => { const r = await call("DELETE", `/api/admin/areas/${del!.id}`, undefined, { success: "Area deleted" }); if (r.ok) setDel(null); }} />
    </Panel>
  );
}
