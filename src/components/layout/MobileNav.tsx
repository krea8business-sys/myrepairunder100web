"use client";
import { clsx } from "clsx";
import { ClipboardList, Home, LayoutGrid, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart/cart-store";

export function MobileNav({ labels }: { labels: { home: string; services: string; cart: string; track: string } }) {
  const path = usePathname();
  const { count, hydrated } = useCart();
  if (path.startsWith("/checkout")) return null; // checkout has its own sticky action bar
  const items = [
    { href: "/", label: labels.home, icon: Home, active: path === "/" },
    { href: "/services", label: labels.services, icon: LayoutGrid, active: path.startsWith("/services") },
    { href: "/cart", label: labels.cart, icon: ShoppingBag, active: path === "/cart", badge: hydrated ? count : 0 },
    { href: "/track", label: labels.track, icon: ClipboardList, active: path.startsWith("/track") || path.startsWith("/booking") },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Mobile">
      <ul className="grid grid-cols-4">
        {items.map(({ href, label, icon: Icon, active, badge }) => (
          <li key={href}>
            <Link href={href} className={clsx("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold", active ? "text-brand-700" : "text-ink-muted")} aria-current={active ? "page" : undefined}>
              <span className="relative">
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
                {!!badge && <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{badge}</span>}
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
