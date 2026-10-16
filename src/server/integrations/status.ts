import { emailConfigured } from "./email";
import { geocoderProvider, mapsConfigured } from "./maps";
import { paymentsConfigured } from "./payments";
import { smsConfigured } from "./sms";
import { webhookConfigured } from "./webhook";
import { whatsappConfigured } from "./whatsapp";

/** Integration status for the admin Settings page (never exposes secret values). */
export function integrationStatus() {
  return [
    { key: "email", name: "Email (Resend)", configured: emailConfigured(), env: ["RESEND_API_KEY", "EMAIL_FROM", "ADMIN_NOTIFY_EMAIL"] },
    { key: "sms", name: "SMS (MSG91, DLT template)", configured: smsConfigured(), env: ["MSG91_AUTH_KEY", "MSG91_TEMPLATE_ID"] },
    { key: "whatsapp", name: "WhatsApp Cloud API notifications", configured: whatsappConfigured(), env: ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_TEMPLATE_NAME"] },
    { key: "webhook", name: "Booking webhook (e.g. Google Sheets)", configured: webhookConfigured(), env: ["BOOKING_WEBHOOK_URL", "BOOKING_WEBHOOK_SECRET"] },
    { key: "maps", name: "Auto-fetch location (reverse geocoding)", configured: mapsConfigured(), note: mapsConfigured() ? `Provider: ${geocoderProvider() === "google" ? "Google Maps" : "OpenStreetMap Nominatim (free) — add GOOGLE_MAPS_API_KEY for better accuracy"}` : undefined, env: ["GOOGLE_MAPS_API_KEY", "NOMINATIM_EMAIL", "GEOCODER"] },
    { key: "payments", name: "Razorpay online payments", configured: false, note: paymentsConfigured() ? "Keys found, but the payment flow is not implemented yet." : undefined, env: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] },
    { key: "analytics", name: "Google Analytics 4", configured: Boolean(process.env.NEXT_PUBLIC_GA_ID), env: ["NEXT_PUBLIC_GA_ID"] },
  ];
}
