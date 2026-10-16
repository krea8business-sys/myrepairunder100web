"use client";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart-store";

export function CartIcon() {
  const { count, hydrated } = useCart();
  const prev = useRef(count);
  const [pop, setPop] = useState(false);
  useEffect(() => {
    if (hydrated && count > prev.current) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 400);
      prev.current = count;
      return () => clearTimeout(t);
    }
    prev.current = count;
  }, [count, hydrated]);
  return (
    <Link href="/cart" className="relative grid h-11 w-11 place-items-center rounded-xl text-navy-900 hover:bg-navy-50" aria-label={`Cart, ${hydrated ? count : 0} items`} data-testid="header-cart">
      <ShoppingBag className="h-[22px] w-[22px]" />
      {hydrated && count > 0 && (
        <span className={`absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white ring-2 ring-white ${pop ? "animate-pop" : ""}`} data-testid="cart-count">
          {count}
        </span>
      )}
    </Link>
  );
}
