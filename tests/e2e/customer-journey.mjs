/**
 * End-to-end customer journey (guest, no login). Run against a running server:
 *   BASE_URL=http://localhost:3000 node tests/e2e/customer-journey.mjs
 * Uses Playwright's Chromium (set CHROMIUM_PATH if Playwright browsers aren't installed).
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOTS = process.env.SHOTS_DIR;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: Number(process.env.VW || 1280), height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`${page.url()} :: ${e.message.slice(0, 80)}`));
const step = (m) => console.log("•", m);
const shot = async (name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
const mobile = Number(process.env.VW || 1280) < 1024;

// 1-2. Open site without login & browse all categories
await page.goto(BASE + "/");
assert.match(await page.title(), /MyRepairUnder100/);
step("homepage loaded (no login)");
const cats = ["ac-repair-service", "washing-machine-repair", "refrigerator-repair", "microwave-repair"];
for (const c of cats) {
  await page.goto(`${BASE}/services/${c}`);
  const n = await page.getByTestId("service-card").count();
  assert.ok(n > 0, `category ${c} has services`);
}
step("browsed all 4 categories");

// 3. Service detail page
await page.goto(`${BASE}/services/ac-repair-service/ac-general-service`);
await page.getByRole("heading", { level: 1, name: "AC general service" }).waitFor();
step("service detail page opened");

// 4. Add multiple services (incl. quantity 2) from different categories
await page.getByRole("button", { name: "Increase quantity" }).first().click();
await page.getByRole("button", { name: /Add to cart/ }).click();
await page.getByTestId("cart-count").filter({ hasText: "2" }).waitFor();
await page.goto(`${BASE}/services/refrigerator-repair`);
await page.getByRole("button", { name: "Add Refrigerator inspection / checkup to cart" }).click();
await page.goto(`${BASE}/services/microwave-repair`);
await page.getByRole("button", { name: "Add Microwave inspection / checkup to cart" }).click();
await page.getByTestId("cart-count").filter({ hasText: "4" }).waitFor();
step("added 3 services from 3 categories (4 units)");

// 5. Change quantity & remove
await page.goto(`${BASE}/cart`);
await page.getByTestId("cart-line").first().waitFor();
assert.equal(await page.getByTestId("cart-line").count(), 3);
await page.getByRole("button", { name: "Remove Microwave inspection / checkup" }).click();
await page.getByTestId("cart-line").nth(1).waitFor();
assert.equal(await page.getByTestId("cart-line").count(), 2);
await page.getByRole("button", { name: "Increase quantity" }).first().click(); // AC general service 2 → 3
await page.getByTestId("summary-total").filter({ hasText: "₹1,446" }).waitFor({ timeout: 8000 }); // 449*3 + 99
step("quantity changed and item removed; server total ₹1,446");

// 6. Refresh → cart persists
await page.reload();
await page.getByTestId("cart-line").first().waitFor();
assert.equal(await page.getByTestId("cart-line").count(), 2);
assert.equal(await page.getByTestId("cart-count").innerText(), "4");
step("cart persisted after refresh");
await shot("01-cart");

// 7. Proceed to checkout (no registration)
await page.getByTestId(mobile ? "proceed-mobile" : "proceed-desktop").click();
await page.waitForURL("**/checkout");
assert.ok(!page.url().includes("login"));
const cont = () => page.getByTestId(mobile ? "continue-mobile" : "continue").click();

// 8. Validation
await cont();
await page.getByText("Please enter your full name").waitFor();
await page.getByLabel("Full name").fill("Test Customer");
await page.getByLabel("Mobile number").fill("12345");
await cont();
await page.getByText("Enter a valid 10-digit Indian mobile number").waitFor();
await page.getByLabel("Mobile number").fill("+91 98765 43210");
await cont();
step("details step validated");

await page.getByLabel("House / flat number").fill("H-12, 2nd floor");
await page.getByLabel("Building, street or locality").fill("Gali No. 5, Sant Nagar");
await page.getByTestId("pincode").fill("400001"); // Mumbai → unserviceable
await page.getByTestId("svc-no").waitFor();
await cont();
await page.getByText("We can't book this pincode online yet.").waitFor();
step("unserviceable pincode blocked");
await page.getByTestId("pincode").fill("110084");
await page.getByTestId("svc-ok").waitFor();
await shot("02-address");
await cont();

// schedule
await page.getByTestId("date-option").first().waitFor();
await cont();
await page.getByText("Choose a valid date").waitFor();
const dates = page.getByTestId("date-option");
const dn = await dates.count();
for (let i = 1; i < dn; i++) {
  if (await dates.nth(i).isEnabled()) { await dates.nth(i).click(); break; }
}
await page.locator('[data-testid=slot-option]:not([disabled])').first().click();
await shot("03-schedule");
await cont();
step("date and slot selected");

// 9. Review
await page.getByRole("heading", { name: "Review your booking" }).waitFor();
const reviewText = await page.locator("main").innerText();
assert.match(reviewText, /Test Customer/);
assert.match(reviewText, /110084/);
await shot("04-review");

// 10/18. Submit (double-click → only one booking)
const confirm = page.getByTestId(mobile ? "confirm-booking-mobile" : "confirm-booking");
await confirm.waitFor();
await confirm.evaluate((el) => { el.click(); el.click(); }); // rapid double-click
await page.waitForURL(/\/booking\/MRU-[A-Z0-9]{8}\?new=1/, { timeout: 15000 });
const code = (await page.getByTestId("booking-code").innerText()).trim();
assert.match(code, /^MRU-[A-HJ-NP-Z2-9]{8}$/);
step(`booking created: ${code}`);
await page.getByTestId("booking-confirmation").waitFor();
await shot("05-confirmation");

// 13. Cart cleared only after success
await page.goto(BASE + "/cart");
await page.getByText("Your cart is empty").waitFor();
step("cart cleared after successful booking");

// 14. Retrieve booking via lookup in a fresh context (no cookie)
const ctx2 = await browser.newContext();
const p2 = await ctx2.newPage();
await p2.goto(`${BASE}/booking/${code}`);
await p2.getByTestId("track-code").waitFor(); // gated: no details without mobile
assert.ok(!(await p2.content()).includes("Test Customer"));
await p2.getByTestId("track-mobile").fill("9876543211"); // wrong mobile
await p2.getByRole("button", { name: /Find my booking/ }).click();
await p2.getByText(/couldn't find a booking/).waitFor();
await p2.getByTestId("track-mobile").fill("9876543210");
await p2.getByRole("button", { name: /Find my booking/ }).click();
await p2.waitForURL(`**/booking/${code}`);
await p2.getByTestId("status-message").waitFor();
step("tracking requires matching ID + mobile");

console.log(`BOOKING_CODE=${code}`);
if (errors.length) console.log("Page errors:", errors);
await browser.close();
