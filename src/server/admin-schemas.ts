import { z } from "zod";
import { parseHHMM } from "@/lib/time";

const slug = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
const optText = (max: number) => z.string().trim().max(max).nullable().optional().transform((v) => (v ? v : null));
const imageUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || v.startsWith("/api/images/") || /^https:\/\//.test(v), "Use an uploaded image or an https:// URL")
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));
const lines = z.array(z.string().trim().min(1).max(200)).max(20);

export const categoryInput = z.object({
  name: z.string().trim().min(2).max(80),
  shortName: z.string().trim().min(1).max(40),
  slug,
  tagline: z.string().trim().max(160).default(""),
  description: z.string().trim().max(400).default(""),
  longDescription: z.string().trim().max(3000).default(""),
  imageUrl,
  illustration: z.enum(["ac", "washer", "fridge", "microwave", "generic"]).default("generic"),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  active: z.boolean().default(true),
  archived: z.boolean().default(false),
  seoTitle: optText(70),
  seoDescription: optText(170),
});

export const serviceInput = z
  .object({
    categoryId: z.string().min(1).max(64),
    name: z.string().trim().min(2).max(120),
    slug,
    shortDescription: z.string().trim().max(200).default(""),
    description: z.string().trim().max(3000).default(""),
    imageUrl,
    priceType: z.enum(["FIXED", "STARTING", "INSPECTION", "QUOTE"]),
    price: z.number().int().min(0, "Price can't be negative").max(1_000_000).nullable(),
    priceIsDemo: z.boolean().default(false),
    inclusions: lines.default([]),
    exclusions: lines.default([]),
    partsExtra: z.boolean().default(true),
    requiresDiagnosis: z.boolean().default(false),
    durationMinutes: z.number().int().min(5).max(1440).nullable().optional().default(null),
    warrantyDays: z.number().int().min(0).max(3650).nullable().optional().default(null),
    warrantyNote: optText(200),
    allowQuantity: z.boolean().default(true),
    maxQuantity: z.number().int().min(1).max(20).default(5),
    popular: z.boolean().default(false),
    active: z.boolean().default(true),
    archived: z.boolean().default(false),
    sortOrder: z.number().int().min(0).max(1000).default(0),
  })
  .refine((v) => v.priceType === "QUOTE" || v.price != null, { message: "Enter a price (or choose “Price to be confirmed”)", path: ["price"] });

export const areaInput = z.object({
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  locality: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "6-digit pincode"),
  active: z.boolean().default(true),
  publishPage: z.boolean().default(false),
  pageIntro: optText(3000),
  categoryIds: z.array(z.string().max(64)).max(50).default([]),
});

const hhmm = z.string().refine((v) => !Number.isNaN(parseHHMM(v)), "Use HH:MM (24h)");
export const slotInput = z
  .object({
    label: z.string().trim().min(3).max(60),
    startTime: hhmm,
    endTime: hhmm,
    capacity: z.number().int().min(0).max(200),
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(100).default(0),
  })
  .refine((v) => parseHHMM(v.endTime) > parseHHMM(v.startTime), { message: "End must be after start", path: ["endTime"] });

export const blockInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotId: z.string().max(64).nullable().default(null),
  reason: z.string().trim().max(120).default(""),
});

export const scheduleInput = z.object({
  workingDays: z.array(z.number().int().min(0).max(6)).max(7),
  bookingWindowDays: z.number().int().min(1).max(60),
  minLeadMinutes: z.number().int().min(0).max(2880),
  asapEnabled: z.boolean(),
  asapCutoff: hhmm,
  asapDailyCapacity: z.number().int().min(0).max(200),
});

const phone = z
  .string()
  .trim()
  .max(20)
  .refine((v) => !v || /^\+?[0-9 ]{10,16}$/.test(v), "Enter a valid phone number with country code, e.g. +91 98xxxxxxxx")
  .nullable()
  .optional()
  .transform((v) => (v ? v : null));

export const settingsInput = z.object({
  businessName: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(160),
  logoUrl: imageUrl,
  supportPhone: phone,
  whatsappNumber: phone,
  contactEmail: z.string().trim().email().max(120).nullable().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  businessAddress: optText(300),
  supportHours: optText(100),
  visitFee: z.number().int().min(0).max(100000),
  visitFeeLabel: z.string().trim().min(2).max(60),
  visitFeeWaiverAbove: z.number().int().min(0).max(1000000).nullable(),
  visitFeeIsDemo: z.boolean(),
  taxEnabled: z.boolean(),
  taxPercent: z.number().min(0).max(50),
  taxLabel: z.string().trim().min(1).max(20),
  pricesIncludeTax: z.boolean(),
  allowCancellationRequest: z.boolean(),
  cancellationCutoffHours: z.number().int().min(0).max(168),
  servicePolicy: z.string().max(10000),
  cancellationPolicy: z.string().max(10000),
  warrantyPolicy: z.string().max(10000),
  privacyPolicy: z.string().max(20000),
  termsOfService: z.string().max(20000),
  paymentMethods: z.array(z.string().trim().min(1).max(80)).max(10),
  faqs: z.array(z.object({ q: z.string().trim().min(3).max(200), a: z.string().trim().min(3).max(1500) })).max(30),
  announcement: optText(200),
  showDemoBanner: z.boolean(),
  notifyCustomerSms: z.boolean(),
  notifyCustomerWhatsapp: z.boolean(),
  notifyCustomerEmail: z.boolean(),
  notifyAdminEmail: z.boolean(),
  notifyWebhook: z.boolean(),
});

export const technicianInput = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(10).max(20),
  email: z.string().trim().email().max(120).nullable().optional().or(z.literal("")).transform((v) => (v ? v : null)),
  pincodes: z.array(z.string().regex(/^[1-9]\d{5}$/)).max(100).default([]),
  localities: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
  active: z.boolean().default(true),
  notes: optText(1000),
  categoryIds: z.array(z.string().max(64)).max(50).default([]),
});

export const adminUserInput = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  name: z.string().trim().min(2).max(80),
  role: z.enum(["OWNER", "MANAGER", "STAFF"]),
  password: z.string().min(12, "At least 12 characters").max(200).optional(),
  active: z.boolean().default(true),
});
