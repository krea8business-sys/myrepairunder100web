import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Settings } from "@/db/schema";
import type { PricingSettings } from "@/lib/pricing";
import type { ScheduleSettings } from "@/lib/slots";

/** Loads the single settings row, creating defaults on first run. */
export async function loadSettings(): Promise<Settings> {
  const rows = await db.select().from(schema.businessSettings).where(eq(schema.businessSettings.id, "default")).limit(1);
  if (rows[0]) return rows[0];
  await db.insert(schema.businessSettings).values({ id: "default" }).onConflictDoNothing();
  const again = await db.select().from(schema.businessSettings).where(eq(schema.businessSettings.id, "default")).limit(1);
  return again[0];
}

/** Request-deduplicated settings for server components. */
export const getSettings = cache(loadSettings);

export function pricingSettings(s: Settings): PricingSettings {
  return {
    visitFee: s.visitFee,
    visitFeeLabel: s.visitFeeLabel,
    visitFeeWaiverAbove: s.visitFeeWaiverAbove,
    taxEnabled: s.taxEnabled,
    taxPercent: s.taxPercent,
    taxLabel: s.taxLabel,
    pricesIncludeTax: s.pricesIncludeTax,
  };
}

export function scheduleSettings(s: Settings): ScheduleSettings {
  return {
    workingDays: s.workingDays,
    bookingWindowDays: s.bookingWindowDays,
    minLeadMinutes: s.minLeadMinutes,
    asapEnabled: s.asapEnabled,
    asapCutoff: s.asapCutoff,
    asapDailyCapacity: s.asapDailyCapacity,
  };
}

/** Public, non-sensitive subset safe to pass to client components. */
export type PublicSettings = {
  businessName: string;
  tagline: string;
  logoUrl: string | null;
  supportPhone: string | null;
  whatsappNumber: string | null;
  contactEmail: string | null;
  supportHours: string | null;
  businessAddress: string | null;
  visitFee: number;
  visitFeeLabel: string;
  visitFeeWaiverAbove: number | null;
  visitFeeIsDemo: boolean;
  showDemoBanner: boolean;
  announcement: string | null;
  paymentMethods: string[];
  allowCancellationRequest: boolean;
  cancellationCutoffHours: number;
};

export function toPublicSettings(s: Settings): PublicSettings {
  return {
    businessName: s.businessName,
    tagline: s.tagline,
    logoUrl: s.logoUrl,
    supportPhone: s.supportPhone,
    whatsappNumber: s.whatsappNumber,
    contactEmail: s.contactEmail,
    supportHours: s.supportHours,
    businessAddress: s.businessAddress,
    visitFee: s.visitFee,
    visitFeeLabel: s.visitFeeLabel,
    visitFeeWaiverAbove: s.visitFeeWaiverAbove,
    visitFeeIsDemo: s.visitFeeIsDemo,
    showDemoBanner: s.showDemoBanner,
    announcement: s.announcement,
    paymentMethods: s.paymentMethods,
    allowCancellationRequest: s.allowCancellationRequest,
    cancellationCutoffHours: s.cancellationCutoffHours,
  };
}
