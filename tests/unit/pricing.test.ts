import { describe, expect, it } from "vitest";
import { calculateQuote, clampQuantity, priceLabel, type PricedService, type PricingSettings } from "@/lib/pricing";

const svc = (o: Partial<PricedService>): PricedService => ({
  id: "s1", name: "Svc", categoryId: "c1", categoryName: "Cat", priceType: "FIXED", price: 449,
  partsExtra: true, requiresDiagnosis: false, allowQuantity: true, maxQuantity: 5, ...o,
});
const base: PricingSettings = { visitFee: 0, visitFeeLabel: "Visit", visitFeeWaiverAbove: null, taxEnabled: false, taxPercent: 18, taxLabel: "GST", pricesIncludeTax: true };

describe("calculateQuote", () => {
  it("sums fixed prices × quantity", () => {
    const q = calculateQuote([{ service: svc({}), quantity: 3 }, { service: svc({ id: "s2", priceType: "INSPECTION", price: 99 }), quantity: 1 }], base);
    expect(q.subtotal).toBe(449 * 3 + 99);
    expect(q.total).toBe(1446);
    expect(q.itemCount).toBe(4);
    expect(q.needsDiagnosis).toBe(true);
  });

  it("treats QUOTE / missing prices as unpriced (₹0, flagged)", () => {
    const q = calculateQuote([{ service: svc({ priceType: "QUOTE", price: null }), quantity: 1 }], base);
    expect(q.total).toBe(0);
    expect(q.hasUnpricedItems).toBe(true);
    expect(q.lines[0].priced).toBe(false);
  });

  it("clamps quantity to 1..max and forces 1 when quantity not allowed", () => {
    expect(clampQuantity(99, { allowQuantity: true, maxQuantity: 5 })).toBe(5);
    expect(clampQuantity(-3, { allowQuantity: true, maxQuantity: 5 })).toBe(1);
    expect(clampQuantity(Number.NaN, { allowQuantity: true, maxQuantity: 5 })).toBe(1);
    expect(clampQuantity(4, { allowQuantity: false, maxQuantity: 5 })).toBe(1);
    const q = calculateQuote([{ service: svc({ maxQuantity: 2 }), quantity: 10 }], base);
    expect(q.lines[0].quantity).toBe(2);
  });

  it("never produces negative amounts", () => {
    const q = calculateQuote([{ service: svc({ price: -500 }), quantity: 2 }], { ...base, visitFee: -50 });
    expect(q.subtotal).toBeGreaterThanOrEqual(0);
    expect(q.visitFee).toBe(0);
  });

  it("adds visit fee once and waives it above the fixed-price threshold", () => {
    const s = { ...base, visitFee: 99, visitFeeWaiverAbove: 1000 };
    expect(calculateQuote([{ service: svc({}), quantity: 1 }], s).total).toBe(449 + 99);
    const waived = calculateQuote([{ service: svc({}), quantity: 3 }], s);
    expect(waived.visitFee).toBe(0);
    expect(waived.visitFeeWaived).toBe(true);
    expect(calculateQuote([], s).visitFee).toBe(0);
  });

  it("handles exclusive and inclusive tax", () => {
    const excl = calculateQuote([{ service: svc({ price: 1000 }), quantity: 1 }], { ...base, taxEnabled: true, pricesIncludeTax: false });
    expect(excl.taxAmount).toBe(180);
    expect(excl.total).toBe(1180);
    const incl = calculateQuote([{ service: svc({ price: 1180 }), quantity: 1 }], { ...base, taxEnabled: true, pricesIncludeTax: true });
    expect(incl.taxAmount).toBe(180);
    expect(incl.total).toBe(1180);
  });

  it("labels prices by type", () => {
    expect(priceLabel({ priceType: "STARTING", price: 349 })).toBe("Starts at ₹349");
    expect(priceLabel({ priceType: "QUOTE", price: null })).toBe("Price to be confirmed");
  });
});
