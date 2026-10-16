/**
 * Generic signed webhook — e.g. a Google Apps Script web app that appends bookings to a Google Sheet,
 * or a Zapier/Make hook. Active only when BOOKING_WEBHOOK_URL is set.
 * Requests carry X-MRU-Signature: hex HMAC-SHA256(body, BOOKING_WEBHOOK_SECRET).
 */
import { createHmac } from "node:crypto";
import type { SendResult } from "./types";

export function webhookConfigured() {
  return Boolean(process.env.BOOKING_WEBHOOK_URL);
}

export async function postWebhook(payload: unknown): Promise<SendResult> {
  if (!webhookConfigured()) return { status: "skipped", detail: "Webhook not configured" };
  const body = JSON.stringify(payload);
  const sig = createHmac("sha256", process.env.BOOKING_WEBHOOK_SECRET || "").update(body).digest("hex");
  try {
    const res = await fetch(process.env.BOOKING_WEBHOOK_URL!, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-MRU-Signature": sig },
      body,
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    return res.ok ? { status: "sent" } : { status: "failed", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "failed", detail: (e as Error).message };
  }
}
