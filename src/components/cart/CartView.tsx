"use client";
import { ArrowRight, Info, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApplianceArt } from "@/components/brand/ApplianceArt";
import { loadDraft, patchDraft } from "@/components/checkout/draft";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Price } from "@/components/ui/Price";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { formatINR } from "@/lib/format";
import { QuantityStepper } from "./AddToCart";
import { cart, useCart } from "./cart-store";
import { PriceSummary } from "./PriceSummary";
import { useQuote } from "./useQuote";

export function CartView() {
  const { lines, hydrated } = useCart();
  const { quote, loading, error, removed, retry, visitFeeIsDemo } = useQuote(lines, hydrated);
  const [note, setNote] = useState("");
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    setNote(loadDraft().note);
  }, []);
  useEffect(() => {
    if (removed.length) toast(`Removed unavailable service: ${removed.join(", ")}`, "info");
  }, [removed, toast]);

  if (!hydrated) {
    return (
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Your cart is empty"
          body="Add services from any appliance category. You can book AC, washing machine, fridge and microwave services together."
          action={<ButtonLink href="/services">Browse services</ButtonLink>}
        />
      </div>
    );
  }

  const quoteLine = (id: string) => quote?.lines.find((l) => l.serviceId === id);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
      <section aria-label="Cart items">
        <ul className="space-y-3">
          {lines.map((l) => {
            const ql = quoteLine(l.serviceId);
            return (
              <li key={l.serviceId} className="card flex gap-4 p-4" data-testid="cart-line">
                <Link href={`/services/${l.categorySlug}/${l.slug}`} className="hidden h-20 w-24 shrink-0 overflow-hidden rounded-xl sm:block" tabIndex={-1} aria-hidden>
                  <ApplianceArt kind={l.illustration} className="h-full w-full" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-brand-700">{l.categoryName}</p>
                  <Link href={`/services/${l.categorySlug}/${l.slug}`} className="font-bold text-navy-900 hover:text-brand-700">
                    {l.name}
                  </Link>
                  <div className="mt-1">
                    <Price priceType={l.priceType} price={l.price} priceIsDemo={l.priceIsDemo} size="sm" />
                    {l.quantity > 1 && l.price != null && l.priceType !== "QUOTE" && <span className="ml-2 text-xs text-ink-muted">each</span>}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {l.allowQuantity && l.maxQuantity > 1 ? (
                      <QuantityStepper label={l.name} value={l.quantity} max={l.maxQuantity} onChange={(n) => cart.setQuantity(l.serviceId, n)} />
                    ) : (
                      <span className="text-xs text-ink-muted">Qty 1 (one visit covers this service)</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        cart.remove(l.serviceId);
                        toast(`${l.name} removed`, "info");
                      }}
                      className="inline-flex h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      aria-label={`Remove ${l.name}`}
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-ink-soft">Subtotal</p>
                  <p className="font-bold text-navy-900">{ql ? (ql.priced ? formatINR(ql.lineTotal) : "TBC") : "…"}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/services" className="mt-4 inline-flex text-sm font-bold text-brand-700 hover:underline">
          + Continue shopping / add more services
        </Link>
        <div className="mt-6">
          <label htmlFor="cart-note" className="mb-1.5 flex justify-between text-sm font-semibold text-navy-900">
            Note for the technician <span className="text-xs font-normal text-ink-soft">Optional</span>
          </label>
          <textarea
            id="cart-note"
            value={note}
            maxLength={500}
            onChange={(e) => {
              setNote(e.target.value);
              patchDraft({ note: e.target.value });
            }}
            placeholder="E.g. AC is 1.5 ton split, brand LG; water dripping since last week"
            className="block min-h-[88px] w-full rounded-xl border border-line-strong px-3.5 py-3 text-[15px] focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>
      </section>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="text-lg font-bold">Price summary</h2>
          <div className="mt-4" aria-live="polite">
            {error ? (
              <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
                <Button size="sm" variant="outline" className="mt-3" onClick={retry}>
                  Retry
                </Button>
              </div>
            ) : !quote || (loading && !quote) ? (
              <div className="space-y-3">
                <Skeleton className="h-5" />
                <Skeleton className="h-5" />
                <Skeleton className="h-8" />
              </div>
            ) : (
              <div className={loading ? "opacity-60 transition" : "transition"}>
                <PriceSummary quote={quote} compact visitFeeIsDemo={visitFeeIsDemo} />
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-2 text-xs text-ink-muted">
            <Info className="h-4 w-4 shrink-0" /> No login needed. You&apos;ll enter your contact details and address next.
          </div>
          <Button size="lg" className="mt-4 hidden w-full lg:flex" disabled={!quote || loading || Boolean(error)} onClick={() => router.push("/checkout")} data-testid="proceed-desktop">
            Proceed to Booking <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </aside>

      {/* mobile sticky action */}
      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-4">
          <div className="min-w-0">
            <p className="text-xs text-ink-muted">Estimated total</p>
            <p className="text-lg font-extrabold text-navy-900">{quote ? formatINR(quote.total) : "…"}</p>
          </div>
          <Button size="lg" className="ml-auto flex-1" disabled={!quote || loading || Boolean(error)} onClick={() => router.push("/checkout")} data-testid="proceed-mobile">
            Proceed to Booking
          </Button>
        </div>
      </div>
    </div>
  );
}
