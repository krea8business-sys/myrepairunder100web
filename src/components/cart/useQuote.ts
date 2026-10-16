"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/pricing";
import { cart, type CartLine } from "./cart-store";

export type QuoteState = { quote: Quote | null; loading: boolean; error: string | null; removed: string[]; visitFeeIsDemo: boolean; retry: () => void };

/** Fetches a trusted quote from the server whenever the cart changes; drops unavailable items. */
export function useQuote(lines: CartLine[], enabled = true): QuoteState {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [visitFeeIsDemo, setDemo] = useState(false);
  const [nonce, setNonce] = useState(0);
  const key = lines.map((l) => `${l.serviceId}:${l.quantity}`).join(",");
  const reqId = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (lines.length === 0) {
      setQuote(null);
      setLoading(false);
      return;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: lines.map((l) => ({ serviceId: l.serviceId, quantity: l.quantity })) }),
        });
        const data = await res.json();
        if (id !== reqId.current) return;
        if (!res.ok) throw new Error(data.error || "Couldn't load prices");
        if (data.unavailable?.length) {
          const names = lines.filter((l) => data.unavailable.includes(l.serviceId)).map((l) => l.name);
          setRemoved(names);
          cart.removeMany(data.unavailable);
        }
        // refresh display snapshots with the latest admin-configured data
        const updates: Record<string, Partial<CartLine>> = {};
        for (const l of lines) {
          const s = data.services?.[l.serviceId];
          if (s && (s.price !== l.price || s.priceType !== l.priceType || s.name !== l.name || s.priceIsDemo !== l.priceIsDemo || s.maxQuantity !== l.maxQuantity)) updates[l.serviceId] = s;
        }
        if (Object.keys(updates).length) cart.sync(updates);
        setQuote(data.quote);
        setDemo(Boolean(data.visitFeeIsDemo));
      } catch (e) {
        if (id === reqId.current) setError((e as Error).message || "Network error");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce, enabled]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { quote, loading, error, removed, visitFeeIsDemo, retry };
}
