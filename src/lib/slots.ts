/**
 * Slot availability — pure computation from admin configuration + current bookings.
 * The server re-runs this inside a locked transaction before creating a booking.
 */
import { addDays, nowIST, parseHHMM, weekdayOf } from "./time";

export type SlotConfig = { id: string; label: string; startTime: string; endTime: string; capacity: number; active: boolean };
export type BlockConfig = { date: string; slotId: string | null };
export type ScheduleSettings = {
  workingDays: number[];
  bookingWindowDays: number;
  minLeadMinutes: number;
  asapEnabled: boolean;
  asapCutoff: string;
  asapDailyCapacity: number;
};

export type SlotAvailability = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  available: boolean;
  remaining: number;
  reason?: "past" | "full" | "blocked";
};

export type DayAvailability = {
  date: string;
  weekday: number;
  isToday: boolean;
  closed: boolean;
  closedReason?: string;
  slots: SlotAvailability[];
  asapAvailable: boolean;
};

/** counts keyed `${date}|${slotId}` and `${date}|ASAP` */
export type BookingCounts = Record<string, number>;

export function computeAvailability(
  settings: ScheduleSettings,
  slots: SlotConfig[],
  blocks: BlockConfig[],
  counts: BookingCounts,
  now: Date = new Date(),
): DayAvailability[] {
  const ist = nowIST(now);
  const activeSlots = slots.filter((s) => s.active).sort((a, b) => parseHHMM(a.startTime) - parseHHMM(b.startTime));
  const days: DayAvailability[] = [];
  const window = Math.max(1, Math.min(60, settings.bookingWindowDays));

  for (let i = 0; i < window; i++) {
    const date = addDays(ist.date, i);
    const weekday = weekdayOf(date);
    const isToday = i === 0;
    const dayBlocked = blocks.some((b) => b.date === date && !b.slotId);
    const working = settings.workingDays.includes(weekday);

    if (!working || dayBlocked) {
      days.push({ date, weekday, isToday, closed: true, closedReason: dayBlocked ? "Holiday / unavailable" : "Closed", slots: [], asapAvailable: false });
      continue;
    }

    const slotList: SlotAvailability[] = activeSlots.map((s) => {
      const used = counts[`${date}|${s.id}`] ?? 0;
      const remaining = Math.max(0, s.capacity - used);
      const blocked = blocks.some((b) => b.date === date && b.slotId === s.id);
      const past = isToday && parseHHMM(s.startTime) - ist.minutes < settings.minLeadMinutes;
      const reason = blocked ? "blocked" : past ? "past" : remaining <= 0 ? "full" : undefined;
      return { id: s.id, label: s.label, startTime: s.startTime, endTime: s.endTime, available: !reason, remaining, reason };
    });

    const asapUsed = counts[`${date}|ASAP`] ?? 0;
    const asapAvailable =
      isToday &&
      settings.asapEnabled &&
      ist.minutes < parseHHMM(settings.asapCutoff) &&
      asapUsed < settings.asapDailyCapacity;

    days.push({ date, weekday, isToday, closed: false, slots: slotList, asapAvailable });
  }
  return days;
}

export function isSlotBookable(days: DayAvailability[], date: string, slotId: string | null | undefined, asap: boolean): boolean {
  const day = days.find((d) => d.date === date);
  if (!day || day.closed) return false;
  if (asap) return day.asapAvailable;
  return day.slots.some((s) => s.id === slotId && s.available);
}
