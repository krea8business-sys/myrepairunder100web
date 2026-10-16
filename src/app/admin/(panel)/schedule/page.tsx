import { asc, gte } from "drizzle-orm";
import { ScheduleManager } from "@/components/admin/ScheduleManager";
import { PageHeader } from "@/components/admin/ui";
import { db, schema } from "@/db";
import { nowIST } from "@/lib/time";
import { requireAdminPage } from "@/server/admin-auth";
import { getSettings } from "@/server/settings";

export const metadata = { title: "Scheduling" };

export default async function ScheduleAdmin() {
  await requireAdminPage("MANAGER");
  const [settings, slots, blocks] = await Promise.all([
    getSettings(),
    db.select().from(schema.timeSlots).orderBy(asc(schema.timeSlots.sortOrder), asc(schema.timeSlots.startTime)),
    db.select().from(schema.blockedPeriods).where(gte(schema.blockedPeriods.date, nowIST().date)).orderBy(asc(schema.blockedPeriods.date)),
  ]);
  return (
    <div>
      <PageHeader title="Scheduling" description="Working days, time slots, capacity and holidays. Times are IST. Capacity is enforced on the server when bookings are created." />
      <ScheduleManager
        schedule={{ workingDays: settings.workingDays, bookingWindowDays: settings.bookingWindowDays, minLeadMinutes: settings.minLeadMinutes, asapEnabled: settings.asapEnabled, asapCutoff: settings.asapCutoff, asapDailyCapacity: settings.asapDailyCapacity }}
        slots={slots}
        blocks={blocks}
      />
    </div>
  );
}
