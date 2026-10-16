/**
 * E2E: auto-fetch location + WhatsApp/Call buttons.
 * Starts a mock Nominatim on :4010 — run the app with NOMINATIM_URL=http://localhost:4010.
 *   BASE_URL=http://localhost:3000 node tests/e2e/location-contact.mjs
 */
import http from "node:http";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const mock = http
  .createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ display_name: "Gali 5, Sant Nagar, Burari, Delhi, 110084, India", address: { road: "Gali No. 5", neighbourhood: "Sant Nagar", suburb: "Burari", city: "Delhi", state: "Delhi", postcode: "110084" } }));
  })
  .listen(4010);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const step = (m) => console.log("•", m);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, geolocation: { latitude: 28.7503, longitude: 77.2009 }, permissions: ["geolocation"] });
const page = await ctx.newPage();

// Contact buttons
await page.goto(BASE + "/");
assert.equal(await page.getByTestId("floating-whatsapp").getAttribute("href"), "https://wa.me/919211010110?text=Hi%20MyRepairUnder100%2C%20I%20want%20to%20book%20a%20repair.");
assert.equal(await page.getByTestId("floating-call").getAttribute("href"), "tel:+917827201114");
assert.equal(await page.getByTestId("header-call").getAttribute("href"), "tel:+917827201114");
assert.match(await page.getByTestId("hero-whatsapp").getAttribute("href"), /^https:\/\/wa\.me\/919211010110/);
step("WhatsApp 9211010110 and call 7827201114 wired in header, hero and floating buttons");

// Header pincode detection
await page.getByRole("button", { name: /Delhi NCR/ }).first().click();
await page.getByTestId("area-detect").click();
await page.getByText(/we serve Burari/).waitFor();
step("header ‘Use my current location’ detected pincode 110084 and confirmed service");

// Checkout auto-fetch
await page.goto(`${BASE}/services/microwave-repair`);
await page.getByRole("button", { name: "Add Microwave inspection / checkup to cart" }).click();
await page.goto(`${BASE}/checkout`);
await page.getByLabel("Full name").fill("Geo Tester");
await page.getByLabel("Mobile number").fill("9811122233");
await page.getByTestId("continue-mobile").click();
await page.getByTestId("geo-message").filter({ hasText: "Location detected" }).waitFor({ timeout: 15000 });
assert.equal(await page.getByTestId("pincode").inputValue(), "110084");
assert.match(await page.getByLabel("Building, street or locality").inputValue(), /Gali No\. 5/);
await page.getByTestId("svc-ok").waitFor();
step("checkout auto-detected location → street, city, pincode filled and serviceability confirmed");

await browser.close();
mock.close();
