/**
 * WhatsApp Business Cloud API (Meta) — active only when WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
 * and WHATSAPP_TEMPLATE_NAME are set. Business-initiated messages must use an approved template
 * whose body has 3 variables: {{1}} name, {{2}} booking ID, {{3}} status.
 * (The "Chat on WhatsApp" support button is separate — it only needs the WhatsApp number in Settings.)
 */
import type { SendResult } from "./types";

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE_NAME);
}

export async function sendWhatsappTemplate(mobile10: string, params: [string, string, string]): Promise<SendResult> {
  if (!whatsappConfigured()) return { status: "skipped", detail: "WhatsApp Cloud API not configured" };
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: `91${mobile10}`,
        type: "template",
        template: {
          name: process.env.WHATSAPP_TEMPLATE_NAME,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
          components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
        },
      }),
      signal: AbortSignal.timeout(6000),
    });
    return res.ok ? { status: "sent" } : { status: "failed", detail: `HTTP ${res.status}` };
  } catch (e) {
    return { status: "failed", detail: (e as Error).message };
  }
}
