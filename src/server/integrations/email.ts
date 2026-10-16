/** Email via Resend's HTTP API — active only when RESEND_API_KEY and EMAIL_FROM are set. */
import type { SendResult } from "./types";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendEmail(to: string, subject: string, text: string): Promise<SendResult> {
  if (!emailConfigured()) return { status: "skipped", detail: "Email provider not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? { status: "sent" } : { status: "failed", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "failed", detail: (e as Error).message };
  }
}
