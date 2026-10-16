import type { Metadata } from "next";
import { Checkout } from "@/components/checkout/Checkout";

export const metadata: Metadata = { title: "Book your service", robots: { index: false } };

export default function CheckoutPage() {
  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-extrabold">Book your service</h1>
      <p className="mt-1 text-sm text-ink-muted">Guest booking — no login, no OTP, no advance payment.</p>
      <Checkout />
    </div>
  );
}
