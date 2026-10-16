import { describe, expect, it } from "vitest";
import { computeAvailability, isSlotBookable, type ScheduleSettings } from "@/lib/slots";
import { allowedTransitions, canTransition } from "@/lib/status";
import { addDays, istToDate, nowIST } from "@/lib/time";

const settings: ScheduleSettings = { workingDays: [1, 2, 3, 4, 5, 6], bookingWindowDays: 7, minLeadMinutes: 120, asapEnabled: true, asapCutoff: "17:00", asapDailyCapacity: 2 };
const slots = [
  { id: "a", label: "9-11", startTime: "09:00", endTime: "11:00", capacity: 2, active: true },
  { id: "b", label: "13-15", startTime: "13:00", endTime: "15:00", capacity: 1, active: true },
  { id: "x", label: "off", startTime: "17:00", endTime: "19:00", capacity: 5, active: false },
];
// Wednesday 14 Oct 2026, 10:30 IST
const now = istToDate("2026-10-14", "10:30");

describe("time helpers (Asia/Kolkata)", () => {
  it("computes IST date/time regardless of server timezone", () => {
    const n = nowIST(now);
    expect(n.date).toBe("2026-10-14");
    expect(n.minutes).toBe(10 * 60 + 30);
    expect(n.weekday).toBe(3);
    // 23:00 UTC on 13th is 04:30 IST on 14th
    expect(nowIST(new Date("2026-10-13T23:00:00Z")).date).toBe("2026-10-14");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("computeAvailability", () => {
  it("hides past/lead-time slots today, inactive slots, and closed days", () => {
    const days = computeAvailability(settings, slots, [], {}, now);
    expect(days).toHaveLength(7);
    const today = days[0];
    expect(today.slots.find((s) => s.id === "a")?.reason).toBe("past");
    expect(today.slots.find((s) => s.id === "b")?.available).toBe(true); // 13:00 is 150 min away
    expect(today.slots.some((s) => s.id === "x")).toBe(false);
    const sunday = days.find((d) => d.weekday === 0)!;
    expect(sunday.closed).toBe(true);
  });

  it("marks full slots and respects capacity", () => {
    const days = computeAvailability(settings, slots, [], { "2026-10-15|a": 2, "2026-10-15|b": 0 }, now);
    const thu = days.find((d) => d.date === "2026-10-15")!;
    expect(thu.slots.find((s) => s.id === "a")).toMatchObject({ available: false, reason: "full", remaining: 0 });
    expect(isSlotBookable(days, "2026-10-15", "a", false)).toBe(false);
    expect(isSlotBookable(days, "2026-10-15", "b", false)).toBe(true);
  });

  it("applies holidays and slot blocks", () => {
    const days = computeAvailability(settings, slots, [{ date: "2026-10-16", slotId: null }, { date: "2026-10-15", slotId: "b" }], {}, now);
    expect(days.find((d) => d.date === "2026-10-16")!.closed).toBe(true);
    expect(days.find((d) => d.date === "2026-10-15")!.slots.find((s) => s.id === "b")?.reason).toBe("blocked");
  });

  it("offers ASAP only today, before cutoff, within capacity", () => {
    let days = computeAvailability(settings, slots, [], {}, now);
    expect(days[0].asapAvailable).toBe(true);
    expect(days[1].asapAvailable).toBe(false);
    days = computeAvailability(settings, slots, [], { "2026-10-14|ASAP": 2 }, now);
    expect(days[0].asapAvailable).toBe(false);
    days = computeAvailability(settings, slots, [], {}, istToDate("2026-10-14", "17:30"));
    expect(days[0].asapAvailable).toBe(false);
  });

  it("rejects dates outside the window", () => {
    const days = computeAvailability(settings, slots, [], {}, now);
    expect(isSlotBookable(days, "2026-12-01", "a", false)).toBe(false);
    expect(isSlotBookable(days, "2026-10-13", "a", false)).toBe(false);
  });
});

describe("status workflow", () => {
  it("allows forward progress and blocks invalid transitions", () => {
    expect(canTransition("RECEIVED", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "TECHNICIAN_ASSIGNED")).toBe(true);
    expect(canTransition("RECEIVED", "COMPLETED")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
    expect(allowedTransitions("CANCELLED")).toEqual([]);
  });
});
