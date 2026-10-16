import "server-only";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createHmac } from "node:crypto";
import type { ZodError } from "zod";
import { fieldErrors } from "@/lib/validation";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, error: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error, ...extra }, { status });
}

export function validationFail(err: ZodError) {
  return fail(422, "Please check the highlighted fields.", { fields: fieldErrors(err) });
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}

/** HMAC a value so identifiers (IPs, mobiles) can be used as keys without storing them raw. */
export function hashKey(value: string): string {
  const secret = process.env.HASH_SECRET || process.env.SESSION_SECRET || "dev-only-insecure";
  return createHmac("sha256", secret).update(value).digest("hex").slice(0, 40);
}

export async function readJson(req: Request, maxBytes = 64_000): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("INVALID_JSON");
  }
}

/** Log without personal data. */
export function logError(context: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[${new Date().toISOString()}] ${context}: ${message.replace(/[6-9]\d{9}/g, "[mobile]")}`);
}
