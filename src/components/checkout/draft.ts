"use client";
/**
 * Checkout draft kept in sessionStorage (cleared when the tab closes) so a refresh or a failed
 * submission never loses what the customer typed. Cleared after a successful booking.
 */
export type Draft = {
  customer: { name: string; mobile: string; email: string };
  address: { houseNo: string; street: string; landmark: string; city: string; state: string; pincode: string; addressType: "HOME" | "OFFICE" | "OTHER"; instructions: string; latitude: number | null; longitude: number | null };
  schedule: { date: string; slotId: string | null; asap: boolean; slotLabel: string };
  note: string;
  step: number;
  idempotencyKey: string;
};

const KEY = "mru_checkout_v1";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

export function emptyDraft(): Draft {
  let pincode = "";
  try {
    pincode = localStorage.getItem("mru_pincode") ?? "";
  } catch {}
  return {
    customer: { name: "", mobile: "", email: "" },
    address: { houseNo: "", street: "", landmark: "", city: "Delhi", state: "Delhi", pincode, addressType: "HOME", instructions: "", latitude: null, longitude: null },
    schedule: { date: "", slotId: null, asap: false, slotLabel: "" },
    note: "",
    step: 0,
    idempotencyKey: uuid(),
  };
}

export function loadDraft(): Draft {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Draft;
      const base = emptyDraft();
      return { ...base, ...d, customer: { ...base.customer, ...d.customer }, address: { ...base.address, ...d.address }, schedule: { ...base.schedule, ...d.schedule } };
    }
  } catch {}
  return emptyDraft();
}

export function saveDraft(d: Draft) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {}
}

export function patchDraft(p: Partial<Draft>) {
  saveDraft({ ...loadDraft(), ...p });
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

/** New idempotency key whenever the cart contents change after a failed attempt. */
export function rotateKey() {
  patchDraft({ idempotencyKey: uuid() });
}
