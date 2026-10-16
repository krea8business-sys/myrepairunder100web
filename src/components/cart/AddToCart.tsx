"use client";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cart, useCart, type CartLine } from "./cart-store";

export type CartableService = Omit<CartLine, "quantity">;

export function QuantityStepper({ value, onChange, max, min = 1, label }: { value: number; onChange: (n: number) => void; max: number; min?: number; label: string }) {
  return (
    <div className="inline-flex h-10 items-center rounded-xl border border-line-strong bg-white" role="group" aria-label={`Quantity for ${label}`}>
      <button type="button" className="grid h-10 w-10 place-items-center rounded-l-xl text-navy-900 hover:bg-navy-50 disabled:opacity-40" onClick={() => onChange(value - 1)} disabled={value <= min} aria-label="Decrease quantity">
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-8 text-center text-[15px] font-bold tabular-nums text-navy-900" aria-live="polite">
        {value}
      </span>
      <button type="button" className="grid h-10 w-10 place-items-center rounded-r-xl text-navy-900 hover:bg-navy-50 disabled:opacity-40" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Compact add / in-cart control for service cards. */
export function AddToCartButton({ service, compact }: { service: CartableService; compact?: boolean }) {
  const { lines, hydrated } = useCart();
  const toast = useToast();
  const inCart = lines.find((l) => l.serviceId === service.serviceId);

  if (hydrated && inCart) {
    if (service.allowQuantity && service.maxQuantity > 1) {
      return (
        <QuantityStepper
          label={service.name}
          value={inCart.quantity}
          max={service.maxQuantity}
          min={0}
          onChange={(n) => {
            if (n <= 0) {
              cart.remove(service.serviceId);
              toast("Removed from cart", "info");
            } else cart.setQuantity(service.serviceId, n);
          }}
        />
      );
    }
    return (
      <Link href="/cart" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-success-50 px-3.5 text-sm font-semibold text-success-700 ring-1 ring-success-100 hover:bg-success-100">
        <Check className="h-4 w-4" /> In cart
      </Link>
    );
  }
  return (
    <Button
      size={compact ? "sm" : "md"}
      variant="secondary"
      className={compact ? "h-10 px-4" : ""}
      onClick={() => {
        cart.add(service, 1);
        toast(`${service.name} added to cart`);
      }}
      aria-label={`Add ${service.name} to cart`}
    >
      <Plus className="h-4 w-4" /> Add
    </Button>
  );
}

/** Full add-to-cart block for the service detail page. */
export function AddToCartPanel({ service }: { service: CartableService }) {
  const { lines, hydrated } = useCart();
  const toast = useToast();
  const [qty, setQty] = useState(1);
  const inCart = lines.find((l) => l.serviceId === service.serviceId);
  return (
    <div className="flex flex-wrap items-center gap-3">
      {service.allowQuantity && service.maxQuantity > 1 && <QuantityStepper label={service.name} value={qty} max={service.maxQuantity} onChange={(n) => setQty(Math.max(1, Math.min(n, service.maxQuantity)))} />}
      <Button
        size="lg"
        className="flex-1 sm:flex-none"
        onClick={() => {
          cart.add(service, qty);
          toast(`${service.name} added to cart`);
        }}
      >
        <ShoppingCart className="h-5 w-5" /> {inCart && hydrated ? "Add more" : "Add to cart"}
      </Button>
      {hydrated && inCart && (
        <Link href="/cart" className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline">
          {inCart.quantity} in cart · View cart →
        </Link>
      )}
    </div>
  );
}
