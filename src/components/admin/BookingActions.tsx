"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { PAYMENT_STATUS_LABEL, STATUS_META, type Status } from "@/lib/status";
import { labelClass, Panel, selectClass, smallInput } from "./ui";
import { useApi } from "./useApi";

type B = {
  id: string; status: Status; technicianId: string | null; cancelRequested: boolean; scheduledDate: string; slotId: string | null; isAsap: boolean;
  serviceCharges: number | null; partsCharges: number | null; extraCharges: number | null; paymentStatus: string; paymentMethod: string | null; paymentReference: string | null;
};

const toNum = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v))));

export function BookingActions({ booking: b, transitions, technicians, slots }: { booking: B; transitions: Status[]; technicians: { id: string; name: string; match: boolean; hint: string }[]; slots: { id: string; label: string; active: boolean }[] }) {
  const { call, pending } = useApi();
  const url = `/api/admin/bookings/${b.id}`;
  const [confirm, setConfirm] = useState<null | { to: Status }>(null);
  const [reason, setReason] = useState("");
  const [tech, setTech] = useState(b.technicianId ?? "");
  const [date, setDate] = useState(b.scheduledDate);
  const [slot, setSlot] = useState(b.isAsap ? "ASAP" : (b.slotId ?? ""));
  const [override, setOverride] = useState(false);
  const [ch, setCh] = useState({ s: b.serviceCharges?.toString() ?? "", p: b.partsCharges?.toString() ?? "", e: b.extraCharges?.toString() ?? "" });
  const [pay, setPay] = useState({ status: b.paymentStatus, method: b.paymentMethod ?? "", ref: b.paymentReference ?? "" });
  const [note, setNote] = useState("");
  const closed = b.status === "COMPLETED" || b.status === "CANCELLED";

  return (
    <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
      {b.cancelRequested && (
        <Panel title="Cancellation request" className="border-red-200">
          <p className="mb-3 text-sm text-ink-muted">The customer asked to cancel. Approving sets the booking to Cancelled.</p>
          <div className="flex gap-2">
            <Button variant="danger" size="sm" loading={pending} onClick={() => call("PATCH", url, { action: "cancel-request", decision: "approve" }, { success: "Booking cancelled" })}>Approve cancellation</Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => call("PATCH", url, { action: "cancel-request", decision: "decline", reason: "Please contact support" }, { success: "Request declined" })}>Decline</Button>
          </div>
        </Panel>
      )}

      <Panel title="Update status">
        {transitions.length === 0 ? (
          <p className="text-sm text-ink-muted">This booking is {STATUS_META[b.status].label.toLowerCase()} — no further status changes.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <Button
                key={t}
                size="sm"
                variant={t === "CANCELLED" ? "outline" : t === "CONFIRMED" || t === "COMPLETED" ? "success" : "secondary"}
                className={t === "CANCELLED" ? "border-red-200 text-red-600 hover:bg-red-50" : ""}
                disabled={pending || (t === "TECHNICIAN_ASSIGNED" && !b.technicianId)}
                title={t === "TECHNICIAN_ASSIGNED" && !b.technicianId ? "Assign a technician first" : undefined}
                onClick={() => (t === "CANCELLED" || t === "COMPLETED" ? setConfirm({ to: t }) : call("PATCH", url, { action: "status", to: t }, { success: `Status: ${STATUS_META[t].label}` }))}
                data-testid={`status-${t}`}
              >
                {t === "CANCELLED" && (b.status === "RECEIVED" || b.status === "PENDING_CONFIRMATION") ? "Reject / cancel" : t === "CONFIRMED" && b.status !== "TECHNICIAN_ASSIGNED" ? "Confirm booking" : `→ ${STATUS_META[t].label}`}
              </Button>
            ))}
          </div>
        )}
      </Panel>
      <ConfirmDialog
        open={Boolean(confirm)}
        onCancel={() => setConfirm(null)}
        loading={pending}
        danger={confirm?.to === "CANCELLED"}
        title={confirm?.to === "CANCELLED" ? "Cancel this booking?" : "Mark as completed?"}
        confirmLabel={confirm?.to === "CANCELLED" ? "Cancel booking" : "Mark completed"}
        onConfirm={async () => {
          const r = await call("PATCH", url, { action: "status", to: confirm!.to, reason: reason || undefined }, { success: "Status updated" });
          if (r.ok) setConfirm(null);
        }}
        body={
          confirm?.to === "CANCELLED" ? (
            <div>
              <p>This can&apos;t be undone. The customer will see the booking as cancelled.</p>
              <label className={`${labelClass} mt-4`}>Reason shown to customer</label>
              <input className={smallInput} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="e.g. No technician available for this slot" />
            </div>
          ) : (
            <p>Make sure final charges and payment status are recorded. Completed bookings can&apos;t be changed further.</p>
          )
        }
      />

      <Panel title="Technician">
        <div className="flex gap-2">
          <select className={`${selectClass} min-w-0 flex-1`} value={tech} onChange={(e) => setTech(e.target.value)} disabled={closed} aria-label="Technician" data-testid="assign-select">
            <option value="">— Unassigned —</option>
            {technicians.map((t) => <option key={t.id} value={t.id}>{t.name}{t.match ? " ✓" : ` (${t.hint})`}</option>)}
          </select>
          <Button size="sm" className="h-10" disabled={closed || pending || tech === (b.technicianId ?? "")} onClick={() => call("PATCH", url, { action: "assign", technicianId: tech || null }, { success: tech ? "Technician assigned" : "Unassigned" })} data-testid="assign-btn">Save</Button>
        </div>
        <p className="mt-2 text-xs text-ink-muted">✓ = skills and pincode match. Assigning on a confirmed booking moves it to “Technician Assigned”.</p>
      </Panel>

      <Panel title="Reschedule">
        <div className="grid grid-cols-2 gap-2">
          <input type="date" className={smallInput} value={date} onChange={(e) => setDate(e.target.value)} disabled={closed} aria-label="Date" />
          <select className={selectClass} value={slot} onChange={(e) => setSlot(e.target.value)} disabled={closed} aria-label="Slot">
            <option value="ASAP">ASAP</option>
            {slots.map((s) => <option key={s.id} value={s.id}>{s.label}{s.active ? "" : " (inactive)"}</option>)}
          </select>
        </div>
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} /> Override capacity / availability</label>
        <Button size="sm" className="mt-3" disabled={closed || pending} onClick={() => call("PATCH", url, { action: "reschedule", date, slotId: slot === "ASAP" ? null : slot, asap: slot === "ASAP", override }, { success: "Appointment updated" })}>Save appointment</Button>
      </Panel>

      <Panel title="Final charges">
        <div className="grid grid-cols-3 gap-2">
          {([["s", "Service"], ["p", "Parts"], ["e", "Extra"]] as const).map(([k, l]) => (
            <label key={k}><span className={labelClass}>{l} ₹</span><input inputMode="numeric" className={smallInput} value={ch[k]} onChange={(e) => setCh({ ...ch, [k]: e.target.value.replace(/\D/g, "") })} /></label>
          ))}
        </div>
        <Button size="sm" className="mt-3" disabled={pending} onClick={() => call("PATCH", url, { action: "charges", serviceCharges: toNum(ch.s), partsCharges: toNum(ch.p), extraCharges: toNum(ch.e) }, { success: "Charges recorded" })}>Record charges</Button>
      </Panel>

      <Panel title="Payment (manual record)">
        <p className="mb-2 text-xs text-ink-muted">Records what you collected. This does not process a payment.</p>
        <select className={`${selectClass} w-full`} value={pay.status} onChange={(e) => setPay({ ...pay, status: e.target.value })} aria-label="Payment status">
          {Object.entries(PAYMENT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className={smallInput} placeholder="Method (cash, UPI…)" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} maxLength={60} />
          <input className={smallInput} placeholder="Reference / UTR" value={pay.ref} onChange={(e) => setPay({ ...pay, ref: e.target.value })} maxLength={120} />
        </div>
        <Button size="sm" className="mt-3" disabled={pending} onClick={() => call("PATCH", url, { action: "payment", paymentStatus: pay.status, paymentMethod: pay.method || null, paymentReference: pay.ref || null }, { success: "Payment status recorded" })}>Save payment status</Button>
      </Panel>

      <Panel title="Internal note">
        <textarea className={`${smallInput} h-24 py-2`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Visible to admins only" aria-label="Internal note" />
        <Button
          size="sm"
          className="mt-2"
          disabled={pending || !note.trim()}
          onClick={async () => {
            const r = await call("PATCH", url, { action: "note", text: note }, { success: "Note added" });
            if (r.ok) setNote("");
          }}
        >
          Add note
        </Button>
      </Panel>
    </div>
  );
}
