import { formatINR } from "@/lib/format";
import { isPriced, type PriceType } from "@/lib/pricing";

/** Consistent price display incl. type label and demo flag. */
export function Price({ priceType, price, priceIsDemo, size = "md" }: { priceType: PriceType; price: number | null; priceIsDemo?: boolean; size?: "sm" | "md" | "lg" }) {
  const big = size === "lg" ? "text-2xl" : size === "sm" ? "text-[15px]" : "text-lg";
  if (!isPriced({ priceType, price })) {
    return <span className="text-sm font-semibold text-ink-muted">Price to be confirmed</span>;
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      {priceType === "STARTING" && <span className="text-xs font-medium text-ink-muted">Starts at</span>}
      <span className={`${big} font-extrabold tracking-tight text-navy-900`}>{formatINR(price as number)}</span>
      {priceType === "INSPECTION" && <span className="text-xs font-medium text-ink-muted">inspection</span>}
      {priceIsDemo && (
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200" title="Placeholder price — the business has not confirmed this price yet">
          Demo price
        </span>
      )}
    </span>
  );
}
