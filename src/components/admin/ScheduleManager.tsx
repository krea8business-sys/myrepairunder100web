"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { BlockedPeriod, TimeSlot } from "@/db/schema";
import { formatDateLabel } from "@/lib/format";
import { formatHHMM } from "@/lib/time";
import { labelClass, Panel, selectClass, smallInput } from "./ui";
import { useApi } from "./useApi";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Sched = { workingDays: number[]; bookingWindowDays: number; minLeadMinutes: number; asapEnabled: boolean; asapCutoff: string; asapDailyCapacity: number };

export function ScheduleManager({ schedule, slots, blocks }: { schedule: Sched; slots: TimeSlot[]; blocks: BlockedPeriod[] }) {
  const { call, pending } = useApi();
  const [s, setS] = useState(schedule);
  const [rows, setRows] = useState(slots.map((x) => ({ ...x, capacity: String(x.capacity) })));
  const [ns, setNs] = useState({ startTime: "", endTime: "", capacity: "3" });
  const [nb, setNb] = useState({ date: "", slotId: "", reason: "" });
  const label = (a: string, b: string) => `${formatHHMM(a)} – ${formatHHMM(b)}`;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Panel title="Working days & booking window">
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d, i) => (
            <label key={d} className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold ring-1 ${s.workingDays.includes(i) ? "bg-navy-900 text-white ring-navy-900" : "ring-line-strong"}`}>
              <input type="checkbox" className="sr-only" checked={s.workingDays.includes(i)} onChange={(e) => setS({ ...s, workingDays: e.target.checked ? [...s.workingDays, i].sort() : s.workingDays.filter((x) => x !== i) })} />
              {d}
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label><span className={labelClass}>Days bookable ahead</span><input inputMode="numeric" className={smallInput} value={s.bookingWindowDays} onChange={(e) => setS({ ...s, bookingWindowDays: Number(e.target.value.replace(/\D/g, "")) || 1 })} /></label>
          <label><span className={labelClass}>Min. lead time (min)</span><input inputMode="numeric" className={smallInput} value={s.minLeadMinutes} onChange={(e) => setS({ ...s, minLeadMinutes: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></label>
          <div />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s.asapEnabled} onChange={(e) => setS({ ...s, asapEnabled: e.target.checked })} /> Offer ASAP today</label>
          <label><span className={labelClass}>ASAP cutoff (HH:MM)</span><input className={smallInput} value={s.asapCutoff} onChange={(e) => setS({ ...s, asapCutoff: e.target.value })} /></label>
          <label><span className={labelClass}>ASAP per day</span><input inputMode="numeric" className={smallInput} value={s.asapDailyCapacity} onChange={(e) => setS({ ...s, asapDailyCapacity: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></label>
        </div>
        <Button className="mt-4" size="sm" loading={pending} onClick={() => call("PATCH", "/api/admin/schedule", s, { success: "Schedule saved" })}>Save</Button>
      </Panel>

      <Panel title="Time slots & capacity">
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2">
              <input type="time" className={`${smallInput} w-28`} value={r.startTime} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, startTime: e.target.value } : x)))} aria-label="Start" />
              <input type="time" className={`${smallInput} w-28`} value={r.endTime} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, endTime: e.target.value } : x)))} aria-label="End" />
              <input inputMode="numeric" className={`${smallInput} w-20`} value={r.capacity} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, capacity: e.target.value.replace(/\D/g, "") } : x)))} aria-label="Capacity" title="Bookings per slot" />
              <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={r.active} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)))} /> On</label>
              <Button size="sm" variant="outline" disabled={pending} onClick={() => call("PATCH", `/api/admin/slots/${r.id}`, { label: label(r.startTime, r.endTime), startTime: r.startTime, endTime: r.endTime, capacity: Number(r.capacity) || 0, active: r.active, sortOrder: i }, { success: "Slot saved" })}>Save</Button>
              <button className="p-1 text-red-600" aria-label="Delete slot" disabled={pending} onClick={() => confirm("Delete this slot? Existing bookings keep their time.") && call("DELETE", `/api/admin/slots/${r.id}`, undefined, { success: "Slot deleted" }).then((x) => x.ok && setRows(rows.filter((y) => y.id !== r.id)))}><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <label><span className={labelClass}>Start</span><input type="time" className={`${smallInput} w-28`} value={ns.startTime} onChange={(e) => setNs({ ...ns, startTime: e.target.value })} /></label>
          <label><span className={labelClass}>End</span><input type="time" className={`${smallInput} w-28`} value={ns.endTime} onChange={(e) => setNs({ ...ns, endTime: e.target.value })} /></label>
          <label><span className={labelClass}>Capacity</span><input inputMode="numeric" className={`${smallInput} w-20`} value={ns.capacity} onChange={(e) => setNs({ ...ns, capacity: e.target.value.replace(/\D/g, "") })} /></label>
          <Button size="sm" className="h-10" disabled={pending || !ns.startTime || !ns.endTime} onClick={async () => { const r = await call("POST", "/api/admin/slots", { label: label(ns.startTime, ns.endTime), startTime: ns.startTime, endTime: ns.endTime, capacity: Number(ns.capacity) || 0, active: true, sortOrder: rows.length }, { success: "Slot added" }); if (r.ok) location.reload(); }}><Plus className="h-4 w-4" /> Add slot</Button>
        </div>
      </Panel>

      <Panel title="Holidays & unavailable periods" className="xl:col-span-2">
        <div className="flex flex-wrap items-end gap-2">
          <label><span className={labelClass}>Date</span><input type="date" className={smallInput} value={nb.date} onChange={(e) => setNb({ ...nb, date: e.target.value })} /></label>
          <label><span className={labelClass}>Block</span><select className={selectClass} value={nb.slotId} onChange={(e) => setNb({ ...nb, slotId: e.target.value })}><option value="">Whole day</option>{slots.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
          <label className="min-w-[200px] flex-1"><span className={labelClass}>Reason (internal)</span><input className={smallInput} value={nb.reason} onChange={(e) => setNb({ ...nb, reason: e.target.value })} placeholder="e.g. Diwali" /></label>
          <Button size="sm" className="h-10" disabled={pending || !nb.date} onClick={async () => { const r = await call("POST", "/api/admin/blocks", { date: nb.date, slotId: nb.slotId || null, reason: nb.reason }, { success: "Blocked" }); if (r.ok) setNb({ date: "", slotId: "", reason: "" }); }}>Add</Button>
        </div>
        <ul className="mt-4 divide-y divide-line text-sm">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between py-2">
              <span><strong>{formatDateLabel(b.date)}</strong> · {b.slotId ? slots.find((x) => x.id === b.slotId)?.label : "Whole day"} {b.reason && <span className="text-ink-muted">— {b.reason}</span>}</span>
              <button className="text-red-600" aria-label="Remove block" onClick={() => call("DELETE", `/api/admin/blocks/${b.id}`, undefined, { success: "Removed" })}><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
          {blocks.length === 0 && <li className="py-2 text-ink-muted">No upcoming holidays or blocks.</li>}
        </ul>
      </Panel>
    </div>
  );
}
