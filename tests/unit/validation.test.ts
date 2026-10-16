import { describe, expect, it } from "vitest";
import { addressSchema, createBookingSchema, customerSchema, normalizeMobile, trackSchema } from "@/lib/validation";

describe("mobile validation", () => {
  it.each(["9876543210", "+91 98765 43210", "09876543210", "919876543210", "+91-98765-43210"])("accepts %s", (m) => {
    expect(customerSchema.safeParse({ name: "Asha Verma", mobile: m }).success).toBe(true);
    expect(normalizeMobile(m)).toBe("9876543210");
  });
  it.each(["12345", "5876543210", "98765432101", "abcdefghij", ""])("rejects %s", (m) => {
    expect(customerSchema.safeParse({ name: "Asha Verma", mobile: m }).success).toBe(false);
  });
});

describe("customer & address", () => {
  it("requires a name and validates optional email", () => {
    expect(customerSchema.safeParse({ name: "", mobile: "9876543210" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "<script>", mobile: "9876543210" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "Ravi", mobile: "9876543210", email: "bad" }).success).toBe(false);
    expect(customerSchema.safeParse({ name: "रवि कुमार", mobile: "9876543210", email: "" }).success).toBe(true);
  });
  it("validates 6-digit pincodes", () => {
    const a = { houseNo: "H-1", street: "Main Road", city: "Delhi", state: "Delhi", addressType: "HOME" };
    expect(addressSchema.safeParse({ ...a, pincode: "110084" }).success).toBe(true);
    expect(addressSchema.safeParse({ ...a, pincode: "011008" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...a, pincode: "11008" }).success).toBe(false);
  });
});

describe("booking payload", () => {
  const valid = {
    idempotencyKey: "0f8fad5b-d9cb-469f-a165-70867728950e",
    customer: { name: "Asha", mobile: "9876543210" },
    address: { houseNo: "1", street: "Main Road", city: "Delhi", state: "Delhi", pincode: "110084", addressType: "HOME" },
    schedule: { date: "2026-10-20", slotId: "abc", asap: false },
    items: [{ serviceId: "x", quantity: 1 }],
  };
  it("accepts a valid booking and ignores unknown total fields", () => {
    const r = createBookingSchema.safeParse({ ...valid, total: 1 });
    expect(r.success).toBe(true);
    expect(r.success && "total" in r.data).toBe(false);
  });
  it("rejects empty cart, bad quantities, missing slot and invalid dates", () => {
    expect(createBookingSchema.safeParse({ ...valid, items: [] }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, items: [{ serviceId: "x", quantity: 0 }] }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, items: [{ serviceId: "x", quantity: -2 }] }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, schedule: { date: "2026-10-20", slotId: null, asap: false } }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, schedule: { date: "2026-02-30", slotId: "a", asap: false } }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...valid, schedule: { date: "2026-10-20", slotId: null, asap: true } }).success).toBe(true);
  });
  it("rejects filled honeypot", () => {
    expect(createBookingSchema.safeParse({ ...valid, website: "spam" }).success).toBe(false);
  });
});

describe("tracking input", () => {
  it("normalises code case and validates format", () => {
    const r = trackSchema.safeParse({ code: " mru-ab23cd45 ", mobile: "9876543210" });
    expect(r.success && r.data.code).toBe("MRU-AB23CD45");
    expect(trackSchema.safeParse({ code: "MRU-1234", mobile: "9876543210" }).success).toBe(false);
    expect(trackSchema.safeParse({ code: "MRU-AB0OCD45", mobile: "9876543210" }).success).toBe(false); // ambiguous chars excluded
  });
});
