import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db, schema } from "@/db";
import { signAdminToken } from "@/server/admin-session";
import { getAvailability } from "@/server/schedule";
import { loadSettings } from "@/server/settings";
import { testCookies, testHeaders } from "../support/setup";

const run = process.env.TEST_DATABASE_URL ? describe : describe.skip;
const json = (body: unknown, method = "POST") => new Request("http://test.local/api", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

run("public booking & tracking API", () => {
  let payload: Record<string, unknown>;
  beforeAll(async () => {
    await db.execute(sql`TRUNCATE bookings, rate_limit_buckets CASCADE`);
    const svc = (await db.select().from(schema.services).where(eq(schema.services.slug, "ac-jet-service")))[0];
    const days = await getAvailability(await loadSettings());
    const day = days.find((d) => !d.isToday && !d.closed && d.slots.some((s) => s.available))!;
    payload = {
      idempotencyKey: crypto.randomUUID(),
      customer: { name: "Api Tester", mobile: "+91 91234 56789" },
      address: { houseNo: "1", street: "Main Road", city: "Delhi", state: "Delhi", pincode: "110009", addressType: "HOME" },
      schedule: { date: day.date, slotId: day.slots.find((s) => s.available)!.id, asap: false },
      items: [{ serviceId: svc.id, quantity: 1 }],
      // attacker-supplied totals must be ignored
      total: 1, subtotal: 1,
    };
  });
  beforeEach(() => {
    testCookies.clear();
    testHeaders.ip = `198.51.100.${Math.floor(Math.random() * 200)}`;
  });

  it("creates a booking, ignores client totals, and grants browser access", async () => {
    const { POST } = await import("@/app/api/bookings/route");
    const res = await POST(json(payload));
    expect(res.status).toBe(201);
    const data = await res.json();
    const b = (await db.select().from(schema.bookings).where(eq(schema.bookings.code, data.code)))[0];
    expect(b.estimatedTotal).toBeGreaterThan(1);
    expect(b.customerMobile).toBe("9123456789");
    expect(testCookies.get("mru_access")).toBeTruthy();
    // retry with same key → 200 replay, still one booking
    const again = await POST(json(payload));
    expect(again.status).toBe(200);
    expect((await again.json()).code).toBe(data.code);
  });

  it("returns field errors for invalid input", async () => {
    const { POST } = await import("@/app/api/bookings/route");
    const res = await POST(json({ ...payload, idempotencyKey: crypto.randomUUID(), customer: { name: "", mobile: "123" } }));
    expect(res.status).toBe(422);
    const data = await res.json();
    expect(data.fields["customer.mobile"]).toBeTruthy();
  });

  it("tracking requires matching booking ID AND mobile, with a generic error", async () => {
    const { POST } = await import("@/app/api/bookings/track/route");
    const code = (await db.select().from(schema.bookings).limit(1))[0].code;
    const wrong = await POST(json({ code, mobile: "9999999999" }));
    expect(wrong.status).toBe(404);
    const unknown = await POST(json({ code: "MRU-ZZZZZZZZ", mobile: "9123456789" }));
    expect(unknown.status).toBe(404);
    expect((await wrong.json()).error).toBe((await unknown.json()).error); // no enumeration signal
    expect(testCookies.get("mru_access")).toBeUndefined();
    const right = await POST(json({ code, mobile: "9123456789" }));
    expect(right.status).toBe(200);
    expect(testCookies.get("mru_access")).toBeTruthy();
  });

  it("rate-limits tracking attempts per IP", async () => {
    const { POST } = await import("@/app/api/bookings/track/route");
    testHeaders.ip = "192.0.2.77";
    const statuses: number[] = [];
    const letters = "ABCDEFGHJKLM";
    for (let i = 0; i < 12; i++) statuses.push((await POST(json({ code: `MRU-YYYYYYY${letters[i]}`, mobile: "9123456789" }))).status);
    expect(statuses.slice(0, 10).every((s) => s === 404)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it("cancellation request requires browser access to that booking", async () => {
    const { POST } = await import("@/app/api/bookings/[code]/cancel/route");
    const code = (await db.select().from(schema.bookings).limit(1))[0].code;
    const ctx = { params: Promise.resolve({ code }) };
    expect((await POST(json({ reason: "Not needed" }), ctx)).status).toBe(403);
  });
});

run("admin API permissions", () => {
  const ids: Record<string, string> = {};
  beforeAll(async () => {
    const hash = await bcrypt.hash("x".repeat(12), 4);
    for (const role of ["OWNER", "MANAGER", "STAFF"] as const) {
      const [u] = await db.insert(schema.adminUsers).values({ email: `${role.toLowerCase()}-${Date.now()}@t.local`, name: role, role, passwordHash: hash }).returning();
      ids[role] = u.id;
    }
    const [inactive] = await db.insert(schema.adminUsers).values({ email: `inactive-${Date.now()}@t.local`, name: "Gone", role: "OWNER", passwordHash: hash, active: false }).returning();
    ids.INACTIVE = inactive.id;
  });
  const as = async (who: keyof typeof ids | null) => {
    testCookies.clear();
    if (who) testCookies.set("mru_admin", await signAdminToken({ sub: ids[who], name: who, role: who === "INACTIVE" ? "OWNER" : (who as "OWNER") }));
  };

  it("rejects unauthenticated, wrong-role and deactivated admins", async () => {
    const settingsRoute = await import("@/app/api/admin/settings/route");
    const svcRoute = await import("@/app/api/admin/services/[id]/route");
    const svc = (await db.select().from(schema.services).limit(1))[0];
    const ctx = { params: Promise.resolve({ id: svc.id }) };

    await as(null);
    expect((await svcRoute.PATCH(json({ price: 1 }, "PATCH"), ctx)).status).toBe(401);
    await as("STAFF");
    expect((await svcRoute.PATCH(json({ price: 1 }, "PATCH"), ctx)).status).toBe(403);
    expect((await settingsRoute.PATCH(json({}, "PATCH"), {})).status).toBe(403);
    await as("MANAGER");
    expect((await settingsRoute.PATCH(json({}, "PATCH"), {})).status).toBe(403);
    await as("INACTIVE");
    expect((await svcRoute.PATCH(json({ price: 1 }, "PATCH"), ctx)).status).toBe(401);
  });

  it("lets managers edit prices (validated, no negatives) and writes an audit log", async () => {
    const svcRoute = await import("@/app/api/admin/services/[id]/route");
    const svc = (await db.select().from(schema.services).where(eq(schema.services.slug, "ac-general-service")))[0];
    const ctx = { params: Promise.resolve({ id: svc.id }) };
    await as("MANAGER");
    expect((await svcRoute.PATCH(json({ price: -5 }, "PATCH"), ctx)).status).toBe(422);
    expect((await svcRoute.PATCH(json({ price: 525, priceIsDemo: false }, "PATCH"), ctx)).status).toBe(200);
    const after = (await db.select().from(schema.services).where(eq(schema.services.id, svc.id)))[0];
    expect(after.price).toBe(525);
    const logs = await db.select().from(schema.auditLogs).where(eq(schema.auditLogs.entityId, svc.id));
    expect(logs.some((l) => l.action === "service.update")).toBe(true);
  });

  it("staff can update bookings but invalid transitions are rejected", async () => {
    const route = await import("@/app/api/admin/bookings/[id]/route");
    const b = (await db.select().from(schema.bookings).limit(1))[0];
    const ctx = { params: Promise.resolve({ id: b.id }) };
    await as("STAFF");
    expect((await route.PATCH(json({ action: "status", to: "COMPLETED" }, "PATCH"), ctx)).status).toBe(409);
    expect((await route.PATCH(json({ action: "status", to: "CONFIRMED" }, "PATCH"), ctx)).status).toBe(200);
    expect((await route.PATCH(json({ action: "status", to: "TECHNICIAN_ASSIGNED" }, "PATCH"), ctx)).status).toBe(409); // no technician yet
    const events = await db.select().from(schema.bookingEvents).where(eq(schema.bookingEvents.bookingId, b.id));
    expect(events.some((e) => e.toStatus === "CONFIRMED" && e.actor === "STAFF")).toBe(true);
  });
});
