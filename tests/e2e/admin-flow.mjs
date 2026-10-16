/**
 * Admin flow E2E. Requires a booking code from customer-journey.mjs and owner credentials:
 *   BASE_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... BOOKING_CODE=MRU-XXXXXXXX MOBILE=9876543210 node tests/e2e/admin-flow.mjs
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const { ADMIN_EMAIL, ADMIN_PASSWORD, BOOKING_CODE, MOBILE = "9876543210", SHOTS_DIR } = process.env;
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const step = (m) => console.log("•", m);
const saveService = async (p) => {
  const [resp] = await Promise.all([p.waitForResponse((r) => r.url().includes("/api/admin/services/") && r.request().method() === "PATCH"), p.getByTestId("save-service").click()]);
  assert.equal(resp.status(), 200);
};

// Unauthenticated access is blocked
const anon = await browser.newContext();
const ap = await anon.newPage();
await ap.goto(`${BASE}/admin`);
assert.ok(ap.url().endsWith("/admin/login"), "redirected to login");
let r = await ap.request.get(`${BASE}/api/admin/bookings/export`);
assert.equal(r.status(), 401);
r = await ap.request.patch(`${BASE}/api/admin/services/x`, { data: { price: 1 }, headers: { origin: BASE } });
assert.equal(r.status(), 401);
r = await ap.request.post(`${BASE}/api/admin/settings`, { data: {}, headers: { origin: "https://evil.example" } });
assert.equal(r.status(), 403, "cross-origin blocked");
step("admin pages & APIs blocked without session; cross-origin POST rejected");

// Wrong password
await ap.fill('input[type="email"]', ADMIN_EMAIL);
await ap.fill('input[type="password"]', "wrong-password-123");
await ap.click('button[type="submit"]');
await ap.getByText("Incorrect email or password.").waitFor();
step("wrong password rejected");

// Login
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/admin/login`);
await page.fill('input[type="email"]', ADMIN_EMAIL);
await page.fill('input[type="password"]', ADMIN_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL(`${BASE}/admin`);
step("owner signed in");
SHOTS_DIR && (await page.screenshot({ path: `${SHOTS_DIR}/a1-overview.png`, fullPage: true }));

// Find booking via search
await page.goto(`${BASE}/admin/bookings?q=${BOOKING_CODE}`);
await page.getByTestId("admin-booking-link").first().click();
await page.waitForURL(/\/admin\/bookings\/[0-9a-f-]{36}$/);
const bookingUrl = page.url();
step("found booking by search");

// Confirm → assign technician → en route
await page.getByTestId("status-CONFIRMED").click();
await page.getByText("Status: Confirmed").waitFor();
await page.getByTestId("assign-select").selectOption({ index: 1 });
await page.getByTestId("assign-btn").click();
await page.getByText("Technician assigned", { exact: true }).first().waitFor();
await page.reload();
await page.getByTestId("status-EN_ROUTE").click();
await page.getByText("Status: Technician En Route").waitFor();
// internal note
await page.getByLabel("Internal note").fill("Customer prefers a call 30 min before arrival.");
await page.getByRole("button", { name: "Add note" }).click();
await page.getByText("Note added").waitFor();
SHOTS_DIR && (await page.screenshot({ path: `${SHOTS_DIR}/a2-booking.png`, fullPage: true }));
step("confirmed, assigned technician, en route, added note");

// Customer sees updated status and NOT the internal note
const cctx = await browser.newContext();
const cp = await cctx.newPage();
await cp.goto(`${BASE}/track?code=${BOOKING_CODE}`);
await cp.getByTestId("track-mobile").fill(MOBILE);
await cp.getByRole("button", { name: /Find my booking/ }).click();
await cp.waitForURL(`**/booking/${BOOKING_CODE}`);
const txt = await cp.locator("main").innerText();
assert.match(txt, /Technician En Route/);
assert.ok(!txt.includes("call 30 min before"), "internal note hidden");
assert.ok(!txt.includes("0000000000"), "technician phone hidden");
step("customer sees ‘Technician En Route’; internal data hidden");

// Price change appears on website
await page.goto(`${BASE}/admin/catalogue`);
await page.getByRole("link", { name: "AC general service", exact: true }).click();
const priceInput = page.locator('label:has-text("Price (₹)") input');
await priceInput.fill("499");
await page.locator('label:has-text("Show “Demo price” label") input').uncheck();
await saveService(page);
await cp.goto(`${BASE}/services/ac-repair-service/ac-general-service`);
const detail = await cp.locator("main").innerText();
assert.match(detail, /₹499/);
step("admin price change (₹449 → ₹499) reflected on website");
// restore
await priceInput.fill("449");
await page.locator('label:has-text("Show “Demo price” label") input').check();
await saveService(page);

// Disable a service → disappears from website
const svcPage = page.url();
await page.locator('label:has-text("Active (bookable)") input').uncheck();
await saveService(page);
let res = await cp.goto(`${BASE}/services/ac-repair-service/ac-general-service`);
assert.equal(res.status(), 404);
await page.goto(svcPage);
await page.locator('label:has-text("Active (bookable)") input').check();
await saveService(page);
res = await cp.goto(`${BASE}/services/ac-repair-service/ac-general-service`);
assert.equal(res.status(), 200);
step("deactivating a service hides it; reactivating restores it");

// Create a STAFF user and check permissions
const staffEmail = `staff${Date.now()}@example.com`;
r = await page.request.post(`${BASE}/api/admin/users`, { data: { email: staffEmail, name: "Staff Tester", role: "STAFF", password: "Staff-Password-123", active: true }, headers: { origin: BASE } });
assert.equal(r.status(), 201);
const sctx = await browser.newContext();
const sp = await sctx.newPage();
await sp.goto(`${BASE}/admin/login`);
await sp.fill('input[type="email"]', staffEmail);
await sp.fill('input[type="password"]', "Staff-Password-123");
await sp.click('button[type="submit"]');
await sp.waitForURL(`${BASE}/admin`);
r = await sp.request.patch(`${BASE}/api/admin/settings`, { data: {}, headers: { origin: BASE } });
assert.equal(r.status(), 403);
r = await sp.request.get(`${BASE}/api/admin/bookings/export`);
assert.equal(r.status(), 403);
await sp.goto(`${BASE}/admin/settings`);
assert.ok(sp.url().includes("denied=1"));
await sp.goto(bookingUrl);
await sp.getByTestId("status-IN_PROGRESS").waitFor(); // staff CAN manage bookings
step("STAFF role: bookings allowed, settings/export forbidden");

// Invalid transition rejected server-side
const id = bookingUrl.split("/").pop();
r = await page.request.patch(`${BASE}/api/admin/bookings/${id}`, { data: { action: "status", to: "RECEIVED" }, headers: { origin: BASE } });
assert.equal(r.status(), 409);
step("invalid status transition rejected (409)");

// CSV export
r = await page.request.get(`${BASE}/api/admin/bookings/export`);
assert.equal(r.status(), 200);
const csv = await r.text();
assert.ok(csv.includes(BOOKING_CODE));
step("CSV export contains booking");

// Complete with charges & payment
await page.goto(bookingUrl);
await page.getByTestId("status-IN_PROGRESS").click();
await page.getByText("Status: Service In Progress").waitFor();
await page.locator('label:has-text("Service ₹") input').fill("1347");
await page.locator('label:has-text("Parts ₹") input').fill("250");
await page.getByRole("button", { name: "Record charges" }).click();
await page.getByText("Charges recorded").waitFor();
await page.getByLabel("Payment status").selectOption("PAID_UPI");
await page.getByRole("button", { name: "Save payment status" }).click();
await page.getByText("Payment status recorded").waitFor();
await page.getByTestId("status-COMPLETED").click();
await page.getByRole("button", { name: "Mark completed" }).click();
await page.getByText("Status updated").waitFor();
await cp.goto(`${BASE}/booking/${BOOKING_CODE}`);
const done = await cp.locator("main").innerText();
assert.match(done, /Completed/);
assert.match(done, /₹1,597/);
step("charges + payment recorded, booking completed; customer sees final amount");

await browser.close();
