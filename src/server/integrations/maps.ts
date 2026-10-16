/**
 * Reverse geocoding (coordinates → address) for "auto-fetch location".
 *
 * Provider order:
 *  1. Google Geocoding API — when GOOGLE_MAPS_API_KEY is set (most accurate for Indian addresses).
 *  2. OpenStreetMap Nominatim — free default, no key. Its usage policy requires an identifying
 *     User-Agent, at most 1 request/second and caching; all three are enforced below.
 *     Set NOMINATIM_EMAIL to your contact email (recommended by the policy).
 *  Set GEOCODER=none to disable reverse geocoding entirely.
 *
 * Results are suggestions only — the customer always confirms/edits the address.
 */

export type ReverseGeocode = { street?: string; locality?: string; city?: string; state?: string; pincode?: string; formatted?: string; provider: "google" | "nominatim" };

export function mapsConfigured() {
  return geocoderProvider() !== "none";
}

export function geocoderProvider(): "google" | "nominatim" | "none" {
  if ((process.env.GEOCODER || "").toLowerCase() === "none") return "none";
  if (process.env.GOOGLE_MAPS_API_KEY) return "google";
  return "nominatim";
}

// --- small in-memory cache (per server instance) ---------------------------
const cache = new Map<string, ReverseGeocode | null>();
const CACHE_MAX = 500;
function cacheKey(lat: number, lng: number) {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`; // ~11 m precision
}
function remember(k: string, v: ReverseGeocode | null) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(k, v);
}

// --- 1 request/second throttle for Nominatim --------------------------------
let nextSlot = 0;
async function throttle() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + 1100;
  if (wait > 4000) throw new Error("Geocoder busy");
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocode | null> {
  const provider = geocoderProvider();
  if (provider === "none") return null;
  const k = `${provider}:${cacheKey(lat, lng)}`;
  if (cache.has(k)) return cache.get(k) ?? null;
  const result = provider === "google" ? await google(lat, lng) : await nominatim(lat, lng);
  remember(k, result);
  return result;
}

async function google(lat: number, lng: number): Promise<ReverseGeocode | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&region=in&key=${process.env.GOOGLE_MAPS_API_KEY}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    status: string;
    results: { formatted_address: string; address_components: { long_name: string; types: string[] }[] }[];
  };
  if (data.status !== "OK" || !data.results[0]) return null;
  const comps = data.results[0].address_components;
  const pick = (t: string) => comps.find((c) => c.types.includes(t))?.long_name;
  return {
    provider: "google",
    formatted: data.results[0].formatted_address,
    street: [pick("route"), pick("sublocality_level_2")].filter(Boolean).join(", ") || undefined,
    locality: pick("sublocality_level_1") || pick("sublocality"),
    city: pick("locality") || pick("administrative_area_level_2"),
    state: pick("administrative_area_level_1"),
    pincode: pick("postal_code"),
  };
}

type NominatimAddress = Partial<
  Record<"house_number" | "road" | "neighbourhood" | "residential" | "quarter" | "suburb" | "village" | "town" | "city" | "city_district" | "county" | "state_district" | "state" | "postcode", string>
>;

/** Pure parser — exported for unit tests. */
export function parseNominatim(data: { display_name?: string; address?: NominatimAddress }): ReverseGeocode | null {
  const a = data.address;
  if (!a) return null;
  const locality = a.suburb || a.neighbourhood || a.residential || a.quarter || a.village || a.city_district;
  const streetParts = [a.road, a.neighbourhood && a.neighbourhood !== locality ? a.neighbourhood : undefined].filter(Boolean);
  const pin = (a.postcode || "").replace(/\s/g, "");
  return {
    provider: "nominatim",
    formatted: data.display_name,
    street: streetParts.join(", ") || undefined,
    locality: locality || undefined,
    city: a.city || a.town || a.state_district || a.county || undefined,
    state: a.state || undefined,
    pincode: /^[1-9]\d{5}$/.test(pin) ? pin : undefined,
  };
}

async function nominatim(lat: number, lng: number): Promise<ReverseGeocode | null> {
  await throttle();
  const base = process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org";
  const email = process.env.NOMINATIM_EMAIL ? `&email=${encodeURIComponent(process.env.NOMINATIM_EMAIL)}` : "";
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://myrepairunder100.example";
  const res = await fetch(`${base}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=en${email}`, {
    headers: { "User-Agent": `MyRepairUnder100-booking/1.0 (+${site})`, Referer: site },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) return null;
  return parseNominatim((await res.json()) as { display_name?: string; address?: NominatimAddress });
}
