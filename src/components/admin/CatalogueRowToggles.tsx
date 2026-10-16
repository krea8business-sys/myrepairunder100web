"use client";
import { useApi } from "./useApi";

export function CatalogueRowToggles({ id, active, popular, archived }: { id: string; active: boolean; popular: boolean; archived: boolean }) {
  const { call, pending } = useApi();
  const patch = (body: Record<string, boolean>, msg: string) => call("PATCH", `/api/admin/services/${id}`, body, { success: msg });
  if (archived) return <button disabled={pending} onClick={() => patch({ archived: false }, "Restored")} className="text-xs font-semibold text-brand-700 hover:underline">Archived — restore</button>;
  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-1.5"><input type="checkbox" checked={active} disabled={pending} onChange={(e) => patch({ active: e.target.checked }, e.target.checked ? "Service enabled" : "Service disabled")} /> Active</label>
      <label className="flex items-center gap-1.5"><input type="checkbox" checked={popular} disabled={pending} onChange={(e) => patch({ popular: e.target.checked }, "Updated")} /> Popular</label>
    </div>
  );
}
