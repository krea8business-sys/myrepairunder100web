import { describe, expect, it } from "vitest";
import { parseNominatim } from "@/server/integrations/maps";

describe("parseNominatim", () => {
  it("maps an Indian address to form fields", () => {
    const r = parseNominatim({
      display_name: "Gali 5, Sant Nagar, Burari, Delhi, 110084, India",
      address: { road: "Gali 5", neighbourhood: "Sant Nagar", suburb: "Burari", city: "Delhi", state: "Delhi", postcode: "110084" },
    });
    expect(r).toMatchObject({ street: "Gali 5, Sant Nagar", locality: "Burari", city: "Delhi", state: "Delhi", pincode: "110084" });
  });
  it("drops invalid pincodes and falls back to town/district for city", () => {
    const r = parseNominatim({ address: { town: "Sonipat", state: "Haryana", postcode: "13 1001" } });
    expect(r?.pincode).toBe("131001");
    expect(r?.city).toBe("Sonipat");
    expect(parseNominatim({ address: { city: "X", postcode: "ABC" } })?.pincode).toBeUndefined();
    expect(parseNominatim({})).toBeNull();
  });
});
