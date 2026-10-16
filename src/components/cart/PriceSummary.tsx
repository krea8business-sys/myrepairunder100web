import { AlertTriangle } from "lucide-react";
import { formatINR } from "@/lib/format";
import type { Quote } from "@/lib/pricing";

export function PriceSummary({ quote, compact, visitFeeIsDemo }: { quote: Quote; compact?: boolean; visitFeeIsDemo?: boolean }) {
  return (
    <div>
      <dl className="space-y-2.5 text-[15px]">
        {!compact &&
          quote.lines.map((l) => (
            <div key={l.serviceId} className="flex justify-between gap-4">
              <dt className="text-ink-muted">
                {l.name}
                {l.quantity > 1 && <span className="text-ink-soft"> × {l.quantity}</span>}
              </dt>
              <dd className="shrink-0 font-semibold text-navy-900">{l.priced ? formatINR(l.lineTotal) : "TBC"}</dd>
            </div>
          ))}
        <div className={`flex justify-between gap-4 ${compact ? "" : "border-t border-line pt-2.5"}`}>
          <dt className="text-ink-muted">Services subtotal</dt>
          <dd className="font-semibold text-navy-900" data-testid="summary-subtotal">{formatINR(quote.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">
            {quote.visitFeeLabel}
            {visitFeeIsDemo && quote.visitFee > 0 && <span className="ml-1 text-[10px] font-bold uppercase text-amber-700">demo</span>}
          </dt>
          <dd className="font-semibold text-navy-900">{quote.visitFeeWaived ? <span className="text-success-600">Waived</span> : quote.visitFee > 0 ? formatINR(quote.visitFee) : "—"}</dd>
        </div>
        {quote.taxAmount > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">{quote.taxIncluded ? `Includes ${quote.taxLabel}` : quote.taxLabel}</dt>
            <dd className="font-semibold text-navy-900">{formatINR(quote.taxAmount)}</dd>
          </div>
        )}
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
          <dt className="font-bold text-navy-900">Estimated total</dt>
          <dd className="text-xl font-extrabold text-navy-900" data-testid="summary-total">{formatINR(quote.total)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          This is an estimate, not a final bill.
          {quote.partsMayBeExtra && " Parts and additional repair costs may be extra."}
          {quote.hasStartingPrices && " Starting / inspection prices are confirmed by the technician after diagnosis."}
          {quote.hasUnpricedItems && " Some services are priced after inspection (TBC)."} You pay after the service — nothing is charged online.
        </p>
      </div>
    </div>
  );
}
