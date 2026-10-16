"use client";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import type { Technician } from "@/db/schema";
import { labelClass, Panel, smallInput } from "./ui";
import { useApi } from "./useApi";

type T = Technician & { categoryIds: string[]; open: number };
const blank = { name: "", phone: "", email: "", pincodes: "", localities: "", active: true, notes: "", categoryIds: [] as string[] };

export function TechniciansManager({ techs, categories }: { techs: T[]; categories: { id: string; name: string }[] }) {
  const { call, pending } = useApi();
  const [edit, setEdit] = useState<null | { id?: string; v: typeof blank }>(null);
  const split = (s: string) => s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  async function save() {
    if (!edit) return;
    const body = { ...edit.v, email: edit.v.email || null, notes: edit.v.notes || null, pincodes: split(edit.v.pincodes), localities: split(edit.v.localities) };
    const r = edit.id ? await call("PATCH", `/api/admin/technicians/${edit.id}`, body, { success: "Technician saved" }) : await call("POST", "/api/admin/technicians", body, { success: "Technician added" });
    if (r.ok) setEdit(null);
  }
  return (
    <Panel title={`${techs.length} technicians`} actions={<Button size="sm" onClick={() => setEdit({ v: { ...blank } })}><Plus className="h-4 w-4" /> Add technician</Button>}>
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft"><tr><th className="px-5 py-2">Name</th><th className="px-3 py-2">Contact</th><th className="px-3 py-2">Skills</th><th className="px-3 py-2">Pincodes</th><th className="px-3 py-2">Open jobs</th><th className="px-5 py-2" /></tr></thead>
          <tbody className="divide-y divide-line">
            {techs.map((t) => (
              <tr key={t.id} className={t.active ? "" : "opacity-60"}>
                <td className="px-5 py-2.5 font-semibold"><Link href={`/admin/technicians/${t.id}`} className="hover:text-brand-700">{t.name}</Link> {!t.active && <Badge>inactive</Badge>}</td>
                <td className="px-3 py-2.5 text-ink-muted">{t.phone}{t.email ? <><br />{t.email}</> : null}</td>
                <td className="px-3 py-2.5 text-ink-muted">{t.categoryIds.map((c) => categories.find((x) => x.id === c)?.name).join(", ") || "—"}</td>
                <td className="px-3 py-2.5 text-ink-muted">{t.pincodes.join(", ") || "Any"}</td>
                <td className="px-3 py-2.5">{t.open}</td>
                <td className="px-5 py-2.5 text-right"><button className="font-semibold text-brand-700 hover:underline" onClick={() => setEdit({ id: t.id, v: { name: t.name, phone: t.phone, email: t.email ?? "", pincodes: t.pincodes.join(", "), localities: t.localities.join(", "), active: t.active, notes: t.notes ?? "", categoryIds: t.categoryIds } })}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal open={Boolean(edit)} onClose={() => setEdit(null)} title={edit?.id ? "Edit technician" : "Add technician"} footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={save} loading={pending}>Save</Button></>}>
        {edit && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className={labelClass}>Name</span><input className={smallInput} value={edit.v.name} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, name: e.target.value } })} /></label>
            <label><span className={labelClass}>Phone</span><input className={smallInput} value={edit.v.phone} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, phone: e.target.value } })} /></label>
            <label className="sm:col-span-2"><span className={labelClass}>Email</span><input className={smallInput} value={edit.v.email} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, email: e.target.value } })} /></label>
            <label><span className={labelClass}>Pincodes (comma separated, empty = any)</span><input className={smallInput} value={edit.v.pincodes} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, pincodes: e.target.value } })} /></label>
            <label><span className={labelClass}>Localities</span><input className={smallInput} value={edit.v.localities} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, localities: e.target.value } })} /></label>
            <fieldset className="sm:col-span-2"><legend className={labelClass}>Skills</legend>
              <div className="flex flex-wrap gap-3 text-sm text-ink">
                {categories.map((c) => <label key={c.id} className="flex items-center gap-1.5"><input type="checkbox" checked={edit.v.categoryIds.includes(c.id)} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, categoryIds: e.target.checked ? [...edit.v.categoryIds, c.id] : edit.v.categoryIds.filter((x) => x !== c.id) } })} /> {c.name}</label>)}
              </div>
            </fieldset>
            <label className="sm:col-span-2"><span className={labelClass}>Internal notes</span><textarea className={`${smallInput} h-20 py-2`} value={edit.v.notes} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, notes: e.target.value } })} /></label>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={edit.v.active} onChange={(e) => setEdit({ ...edit, v: { ...edit.v, active: e.target.checked } })} /> Active</label>
          </div>
        )}
      </Modal>
    </Panel>
  );
}
