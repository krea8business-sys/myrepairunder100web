/** Shared Zod schemas — used by the checkout UI and re-checked on the server. */
import { z } from "zod";
import { isValidISODate } from "./time";

/** Normalises +91 / 0 prefixes and spaces. Returns 10 digits or the cleaned input. */
export function normalizeMobile(input: string): string {
  let d = (input || "").replace(/[\s\-()]/g, "");
  if (d.startsWith("+91")) d = d.slice(3);
  else if (d.startsWith("0091")) d = d.slice(4);
  else if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

export const INDIAN_MOBILE = /^[6-9]\d{9}$/;
export const PINCODE = /^[1-9]\d{5}$/;

const trimmed = (max: number) => z.string().trim().max(max, `Must be ${max} characters or fewer`);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .transform((v) => (v ? v : undefined));

export const mobileSchema = z
  .string({ required_error: "Mobile number is required" })
  .transform(normalizeMobile)
  .refine((v) => INDIAN_MOBILE.test(v), "Enter a valid 10-digit Indian mobile number");

export const customerSchema = z.object({
  name: trimmed(80)
    .min(2, "Please enter your full name")
    .regex(/^[\p{L}\p{M} .'-]+$/u, "Name can only contain letters, spaces, dots and hyphens"),
  mobile: mobileSchema,
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v.toLowerCase() : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, "Enter a valid email address"),
});

export const addressSchema = z.object({
  houseNo: trimmed(80).min(1, "House / flat number is required"),
  street: trimmed(160).min(3, "Building, street or locality is required"),
  landmark: optionalText(120),
  city: trimmed(60).min(2, "City is required"),
  state: trimmed(60).min(2, "State is required"),
  pincode: z
    .string()
    .trim()
    .refine((v) => PINCODE.test(v), "Enter a valid 6-digit pincode"),
  addressType: z.enum(["HOME", "OFFICE", "OTHER"]).default("HOME"),
  instructions: optionalText(300),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const scheduleSchema = z
  .object({
    date: z.string().refine(isValidISODate, "Choose a valid date"),
    slotId: z.string().min(1).max(64).optional().nullable(),
    asap: z.boolean().default(false),
  })
  .refine((v) => v.asap || !!v.slotId, { message: "Choose a time slot", path: ["slotId"] });

export const cartItemSchema = z.object({
  serviceId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(20),
});

export const cartSchema = z.array(cartItemSchema).min(1, "Your cart is empty").max(20, "Too many items in cart");

export const createBookingSchema = z.object({
  idempotencyKey: z.string().min(16).max(64).regex(/^[A-Za-z0-9-]+$/),
  customer: customerSchema,
  address: addressSchema,
  schedule: scheduleSchema,
  items: cartSchema,
  note: optionalText(500),
  // honeypot: real users never fill this
  website: z.string().max(0).optional(),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const BOOKING_CODE = /^MRU-[A-HJ-NP-Z2-9]{8}$/;

export const trackSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => BOOKING_CODE.test(v), "Enter a valid booking ID, e.g. MRU-AB12CD34"),
  mobile: mobileSchema,
});

export const cancelRequestSchema = z.object({
  reason: trimmed(300).min(3, "Please tell us why you want to cancel"),
});

/** Flatten Zod errors to { "address.pincode": "message" } */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
