"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatINR } from "@/lib/format";
import { useCart } from "./cart-store";

/** Sticky "view cart" bar shown on browsing pages once the cart has items. */
export function CartBar() {
  const { lines, count, hydrated } = useCart();
  if (!hydrated || count === 0) return null;
  const est = lines.reduce((s, l) => s + (l.priceType !== "QUOTE" && l.price != null ? l.price * l.quantity : 0), 0);
  return (
    <div className="fixed inset-x-0 bottom-16 z-30 px-3 pb-2 md:bottom-4 md:px-0">
      <Link
        href="/cart"
        className="mx-auto flex max-w-xl animate-fade-up items-center justify-between gap-3 rounded-2xl bg-navy-900 px-5 py-3.5 text-white shadow-lift hover:bg-navy-800"
        data-testid="cart-bar"
      >
        <span className="text-sm">
          <span className="font-bold">{count} item{count > 1 ? "s" : ""}</span>
          {est > 0 && <span className="text-navy-200"> · from {formatINR(est)}</span>}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold">
          View cart <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  );
}
