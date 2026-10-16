"use client";
import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BOOKING_STATUSES, STATUS_META } from "@/lib/status";
import { selectClass, smallInput } from "./ui";

export function BookingFilters({ categories }: { categories: { id: string; name: string }[] }) {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const set = (patch: Record<string, string>) => {
    const u = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) (v ? u.set(k, v) : u.delete(k));
    u.delete("page");
    router.push(`${path}?${u.toString()}`);
  };
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-line bg-white p-3">
      <form
        className="flex min-w-[240px] flex-1 gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          set({ q });
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search booking ID, name, mobile, locality" className={smallInput} aria-label="Search bookings" />
        <Button type="submit" size="sm" className="h-10"><Search className="h-4 w-4" /></Button>
      </form>
      <select className={selectClass} value={sp.get("status") ?? ""} onChange={(e) => set({ status: e.target.value })} aria-label="Status">
        <option value="">All statuses</option>
        <option value="OPEN">Needs action (new + pending)</option>
        {BOOKING_STATUSES.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
      </select>
      <select className={selectClass} value={sp.get("category") ?? ""} onChange={(e) => set({ category: e.target.value })} aria-label="Service category">
        <option value="">All services</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <input className={`${selectClass} w-28`} placeholder="Pincode" defaultValue={sp.get("pincode") ?? ""} maxLength={6} onBlur={(e) => e.target.value !== (sp.get("pincode") ?? "") && set({ pincode: e.target.value })} aria-label="Pincode" />
      <label className="flex items-center gap-1 text-xs text-ink-muted">From <input type="date" className={selectClass} value={sp.get("from") ?? ""} onChange={(e) => set({ from: e.target.value })} /></label>
      <label className="flex items-center gap-1 text-xs text-ink-muted">To <input type="date" className={selectClass} value={sp.get("to") ?? ""} onChange={(e) => set({ to: e.target.value })} /></label>
      <label className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm"><input type="checkbox" checked={sp.get("cancel") === "1"} onChange={(e) => set({ cancel: e.target.checked ? "1" : "" })} /> Cancel requests</label>
      {sp.toString() && <Button variant="ghost" size="sm" className="h-10" onClick={() => router.push(path)}>Clear</Button>}
    </div>
  );
}
