import "server-only";
import { db, schema } from "@/db";
import type { Settings } from "@/db/schema";
import { formatINR } from "@/lib/format";
import { logError } from "../http";
import { sendEmail } from "./email";
import { sendSms } from "./sms";
import type { BookingNotice, SendResult } from "./types";
import { postWebhook } from "./webhook";
import { sendWhatsappTemplate } from "./whatsapp";

/**
 * Fan out a booking notification to every configured channel and record the outcome.
 * Unconfigured channels are recorded as "skipped" — we never claim a message was sent.
 */
export async function notifyBooking(bookingId: string, n: BookingNotice, settings: Settings): Promise<void> {
  const jobs: [string, Promise<SendResult>][] = [];
  const services = n.services.map((s) => `${s.name}${s.quantity > 1 ? ` ×${s.quantity}` : ""}`).join(", ");

  if (settings.notifyCustomerSms) jobs.push(["sms", sendSms(n.customerMobile, { code: n.code, status: n.statusLabel, date: n.scheduledDate })]);
  if (settings.notifyCustomerWhatsapp) jobs.push(["whatsapp", sendWhatsappTemplate(n.customerMobile, [n.customerName, n.code, n.statusLabel])]);
  if (settings.notifyCustomerEmail && n.customerEmail) {
    jobs.push([
      "email",
      sendEmail(
        n.customerEmail,
        `${settings.businessName} booking ${n.code}: ${n.statusLabel}`,
        `Hi ${n.customerName},\n\nBooking ${n.code} — ${n.statusLabel}.\nServices: ${services}\nRequested: ${n.scheduledDate}, ${n.slotLabel}\nEstimated charges: ${formatINR(n.estimatedTotal)} (final amount confirmed on site)\n\nTrack your booking: ${n.trackUrl}\n\n— ${settings.businessName}`,
      ),
    ]);
  }
  if (settings.notifyAdminEmail && process.env.ADMIN_NOTIFY_EMAIL && n.event !== "booking.status_changed") {
    jobs.push([
      "email-admin",
      sendEmail(
        process.env.ADMIN_NOTIFY_EMAIL,
        `[${settings.businessName}] ${n.event === "booking.created" ? "New booking" : "Cancellation request"} ${n.code}`,
        `${n.event}\nBooking: ${n.code}\nServices: ${services}\nDate: ${n.scheduledDate}, ${n.slotLabel}\nPincode: ${n.pincode}\nOpen the admin dashboard for customer details.`,
      ),
    ]);
  }
  if (settings.notifyWebhook) jobs.push(["webhook", postWebhook({ ...n, sentAt: new Date().toISOString() })]);

  const results = await Promise.allSettled(jobs.map(([, p]) => p));
  const rows = results.map((r, i) => ({
    bookingId,
    channel: jobs[i][0],
    event: n.event,
    status: r.status === "fulfilled" ? r.value.status : "failed",
    detail: r.status === "fulfilled" ? (r.value.detail ?? null) : String(r.reason).slice(0, 200),
  }));
  // Collapse "nothing configured" into one row to keep the log readable.
  const finalRows = rows.length && rows.every((r) => r.status === "skipped")
    ? [{ bookingId, channel: "all", event: n.event, status: "skipped", detail: `Not sent — no channel configured (${rows.map((r) => r.channel).join(", ")})` }]
    : rows;
  if (finalRows.length) {
    try {
      await db.insert(schema.notificationLogs).values(finalRows);
    } catch (e) {
      logError("notification log", e);
    }
  }
}
