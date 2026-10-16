import type { Metadata } from "next";
import { CartView } from "@/components/cart/CartView";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-page py-8 pb-32 md:pb-12">
      <h1 className="text-3xl font-extrabold">Your cart</h1>
      <CartView />
    </div>
  );
}
