/**
 * Pricing engine — pure and deterministic, used on the server for trusted totals
 * (and mirrored in the UI only for display). Never trust totals sent by a browser.
 */

export type PriceType = "FIXED" | "STARTING" | "INSPECTION" | "QUOTE";

export type PricedService = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  priceType: PriceType;
  price: number | null;
  partsExtra: boolean;
  requiresDiagnosis: boolean;
  allowQuantity: boolean;
  maxQuantity: number;
  priceIsDemo?: boolean;
};

export type PricingSettings = {
  visitFee: number;
  visitFeeLabel: string;
  visitFeeWaiverAbove: number | null;
  taxEnabled: boolean;
  taxPercent: number;
  taxLabel: string;
  pricesIncludeTax: boolean;
};

export type QuoteLine = {
  serviceId: string;
  name: string;
  categoryId: string;
  categoryName: string;
  priceType: PriceType;
  unitPrice: number | null;
  quantity: number;
  lineTotal: number;
  partsExtra: boolean;
  priced: boolean;
  priceIsDemo: boolean;
};

export type Quote = {
  lines: QuoteLine[];
  subtotal: number;
  fixedSubtotal: number;
  visitFee: number;
  visitFeeWaived: boolean;
  visitFeeLabel: string;
  taxAmount: number;
  taxLabel: string;
  taxIncluded: boolean;
  total: number;
  hasUnpricedItems: boolean;
  hasStartingPrices: boolean;
  needsDiagnosis: boolean;
  partsMayBeExtra: boolean;
  itemCount: number;
};

export function clampQuantity(qty: unknown, svc: Pick<PricedService, "allowQuantity" | "maxQuantity">): number {
  const n = Math.floor(Number(qty));
  if (!Number.isFinite(n) || n < 1) return 1;
  if (!svc.allowQuantity) return 1;
  return Math.min(n, Math.max(1, svc.maxQuantity));
}

export function isPriced(svc: Pick<PricedService, "priceType" | "price">): boolean {
  return svc.priceType !== "QUOTE" && typeof svc.price === "number" && svc.price >= 0;
}

export function priceLabel(svc: Pick<PricedService, "priceType" | "price">): string {
  if (!isPriced(svc)) return "Price to be confirmed";
  const p = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    svc.price as number,
  );
  switch (svc.priceType) {
    case "STARTING":
      return `Starts at ${p}`;
    case "INSPECTION":
      return `${p} inspection`;
    default:
      return p;
  }
}

/**
 * Build a quote. Unknown/inactive services must be filtered out by the caller
 * (calculateQuote only prices what it is given).
 */
export function calculateQuote(
  items: { service: PricedService; quantity: number }[],
  settings: PricingSettings,
): Quote {
  const lines: QuoteLine[] = items.map(({ service, quantity }) => {
    const qty = clampQuantity(quantity, service);
    const priced = isPriced(service);
    const unit = priced ? Math.max(0, Math.round(service.price as number)) : null;
    return {
      serviceId: service.id,
      name: service.name,
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      priceType: service.priceType,
      unitPrice: unit,
      quantity: qty,
      lineTotal: unit === null ? 0 : unit * qty,
      partsExtra: service.partsExtra,
      priced,
      priceIsDemo: Boolean(service.priceIsDemo),
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const fixedSubtotal = lines.filter((l) => l.priceType === "FIXED").reduce((s, l) => s + l.lineTotal, 0);

  const baseVisitFee = Math.max(0, Math.round(settings.visitFee || 0));
  const waived =
    baseVisitFee > 0 &&
    settings.visitFeeWaiverAbove != null &&
    settings.visitFeeWaiverAbove > 0 &&
    fixedSubtotal >= settings.visitFeeWaiverAbove;
  const visitFee = lines.length === 0 || waived ? 0 : baseVisitFee;

  const taxable = subtotal + visitFee;
  let taxAmount = 0;
  if (settings.taxEnabled && settings.taxPercent > 0) {
    const rate = settings.taxPercent / 100;
    taxAmount = settings.pricesIncludeTax
      ? Math.round(taxable - taxable / (1 + rate)) // informational: already included
      : Math.round(taxable * rate);
  }
  const total = settings.taxEnabled && !settings.pricesIncludeTax ? taxable + taxAmount : taxable;

  return {
    lines,
    subtotal,
    fixedSubtotal,
    visitFee,
    visitFeeWaived: waived,
    visitFeeLabel: settings.visitFeeLabel,
    taxAmount,
    taxLabel: settings.taxLabel,
    taxIncluded: settings.pricesIncludeTax,
    total,
    hasUnpricedItems: lines.some((l) => !l.priced),
    hasStartingPrices: lines.some((l) => l.priceType === "STARTING" || l.priceType === "INSPECTION"),
    needsDiagnosis: items.some((i) => i.service.requiresDiagnosis || i.service.priceType === "INSPECTION"),
    partsMayBeExtra: lines.some((l) => l.partsExtra),
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
  };
}
