"use client";
/**
 * Guest cart persisted in localStorage (non-sensitive: service IDs + display snapshot).
 * Prices shown from the snapshot are for display only — the server re-prices everything
 * via /api/cart/quote and again when the booking is created.
 */
import { useSyncExternalStore } from "react";
import type { PriceType } from "@/lib/pricing";

export type CartLine = {
  serviceId: string;
  quantity: number;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  illustration: string;
  priceType: PriceType;
  price: number | null;
  priceIsDemo: boolean;
  allowQuantity: boolean;
  maxQuantity: number;
};

const KEY = "mru_cart_v1";
const EVT = "mru-cart-change";
const EMPTY: CartLine[] = [];
let cacheRaw: string | null = null;
let cacheVal: CartLine[] = EMPTY;

function read(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return cacheVal;
  }
  if (raw === cacheRaw) return cacheVal;
  cacheRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cacheVal = Array.isArray(parsed)
      ? parsed.filter((l): l is CartLine => l && typeof l.serviceId === "string" && Number.isInteger(l.quantity) && l.quantity > 0)
      : EMPTY;
  } catch {
    cacheVal = EMPTY;
  }
  return cacheVal;
}

function write(lines: CartLine[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* storage full / blocked — cart works for this page view only */
    cacheRaw = JSON.stringify(lines);
    cacheVal = lines;
  }
  window.dispatchEvent(new Event(EVT));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

const clamp = (q: number, l: Pick<CartLine, "allowQuantity" | "maxQuantity">) =>
  !l.allowQuantity ? 1 : Math.max(1, Math.min(Math.floor(q) || 1, Math.max(1, l.maxQuantity)));

export const cart = {
  add(line: Omit<CartLine, "quantity">, quantity = 1) {
    const lines = read();
    const existing = lines.find((l) => l.serviceId === line.serviceId);
    const next = existing
      ? lines.map((l) => (l.serviceId === line.serviceId ? { ...line, quantity: clamp(l.quantity + quantity, line) } : l))
      : [...lines, { ...line, quantity: clamp(quantity, line) }];
    write(next.slice(0, 20));
  },
  setQuantity(serviceId: string, quantity: number) {
    write(read().map((l) => (l.serviceId === serviceId ? { ...l, quantity: clamp(quantity, l) } : l)));
  },
  remove(serviceId: string) {
    write(read().filter((l) => l.serviceId !== serviceId));
  },
  removeMany(ids: string[]) {
    write(read().filter((l) => !ids.includes(l.serviceId)));
  },
  /** Refresh display snapshot from server data (prices/names may have changed). */
  sync(updates: Partial<Record<string, Partial<CartLine>>>) {
    write(read().map((l) => (updates[l.serviceId] ? { ...l, ...updates[l.serviceId], serviceId: l.serviceId } : l)));
  },
  clear() {
    write([]);
  },
};

export function useCart() {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const count = lines.reduce((s, l) => s + l.quantity, 0);
  return { lines, count, hydrated };
}
