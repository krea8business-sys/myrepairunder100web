"use client";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { formatDateTimeIST } from "@/lib/format";
import { labelClass, Panel, selectClass, smallInput } from "./ui";
import { useApi } from "./useApi";

type U = { id: string; email: string; name: string; role: "OWNER" | "MANAGER" | "STAFF"; active: boolean; lastLoginAt: string | null };

export function UsersManager({ users, meId }: { users: U[]; meId: string }) {
  const { call, pending } = useApi();
  const [edit, setEdit] = useState<null | { id?: string; email: string; name: string; role: U["role"]; active: boolean; password: string }>(null);
  return (
    <Panel title={`${users.length} admins`} actions={<Button size="sm" onClick={() => setEdit({ email: "", name: "", role: "STAFF", active: true, password: "" })}><Plus className="h-4 w-4" /> Add admin</Button>}>
      <ul className="divide-y divide-line text-sm">
        {users.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
            <span><strong>{u.name}</strong> {u.id === meId && "(you)"} · {u.email} · <span className="font-semibold">{u.role}</span> {!u.active && <span className="text-red-600">· inactive</span>}<br /><span className="text-xs text-ink-soft">Last sign-in: {u.lastLoginAt ? formatDateTimeIST(u.lastLoginAt) : "never"}</span></span>
            <Button size="sm" variant="outline" onClick={() => setEdit({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active, password: "" })}>Edit</Button>
          </li>
        ))}
      </ul>
      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit admin" : "Add admin"}
        footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button loading={pending} onClick={async () => {
          const { id, password, ...rest } = edit!;
          const body = { ...rest, ...(password ? { password } : {}) };
          const r = id ? await call("PATCH", `/api/admin/users/${id}`, body, { success: "Saved" }) : await call("POST", "/api/admin/users", body, { success: "Admin added" });
          if (r.ok) setEdit(null);
        }}>Save</Button></>}
      >
        {edit && (
          <div className="grid gap-3">
            <label><span className={labelClass}>Name</span><input className={smallInput} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
            <label><span className={labelClass}>Email</span><input type="email" className={smallInput} value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></label>
            <label><span className={labelClass}>Role</span><select className={`${selectClass} w-full`} value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as U["role"] })}><option>STAFF</option><option>MANAGER</option><option>OWNER</option></select></label>
            <label><span className={labelClass}>{edit.id ? "New password (leave blank to keep)" : "Initial password (12+ characters)"}</span><input type="password" autoComplete="new-password" className={smallInput} value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active</label>
          </div>
        )}
      </Modal>
    </Panel>
  );
}
