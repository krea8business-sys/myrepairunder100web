/** Formatting helpers shared by client and server. */

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatINR(amount: number): string {
  return inr.format(Math.round(amount));
}

/** Mask a mobile for logs/admin lists: 98XXXXXX10 */
export function maskMobile(mobile: string): string {
  const d = mobile.replace(/\D/g, "");
  if (d.length < 4) return "XXXX";
  return `${d.slice(0, 2)}${"X".repeat(Math.max(0, d.length - 4))}${d.slice(-2)}`;
}

export function formatMobile(mobile: string): string {
  const d = mobile.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : mobile;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr${h > 1 ? "s" : ""}`;
}

/** "2026-10-18" -> "Sun, 18 Oct 2026" (date-only, timezone-agnostic) */
export function formatDateLabel(isoDate: string, opts: { withYear?: boolean } = {}): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: opts.withYear === false ? undefined : "numeric",
    timeZone: "UTC",
  }).format(dt);
}

export function formatDateTimeIST(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(d);
}

export function whatsappLink(number: string | null | undefined, text?: string): string | null {
  if (!number) return null;
  const digits = number.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function telLink(number: string | null | undefined): string | null {
  if (!number) return null;
  const digits = number.replace(/[^\d+]/g, "");
  return digits.length >= 10 ? `tel:${digits}` : null;
}
