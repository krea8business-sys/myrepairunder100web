/**
 * SMS via MSG91 Flow API — active only when MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are set.
 * Indian SMS requires a DLT-registered template; configure the template in MSG91 with
 * variables: code, status, date. Nothing is sent until those credentials exist.
 */
import type { SendResult } from "./types";

export function smsConfigured() {
  return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID);
}

export async function sendSms(mobile10: string, vars: Record<string, string>): Promise<SendResult> {
  if (!smsConfigured()) return { status: "skipped", detail: "SMS provider not configured" };
  try {
    const res = await fetch("https://control.msg91.com/api/v5/flow", {
      method: "POST",
      headers: { authkey: process.env.MSG91_AUTH_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: process.env.MSG91_TEMPLATE_ID, short_url: "0", recipients: [{ mobiles: `91${mobile10}`, ...vars }] }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? { status: "sent" } : { status: "failed", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "failed", detail: (e as Error).message };
  }
}
