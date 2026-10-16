import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { hashKey } from "./http";

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSec: number };

/**
 * Postgres-backed fixed-window limiter — works across multiple server instances.
 * Fails open (allows) if the database errors, so customers are never locked out by infra issues.
 */
export async function rateLimit(bucket: string, identifier: string, limit: number, windowSec: number): Promise<RateLimitResult> {
  const key = `${bucket}:${hashKey(identifier)}`;
  try {
    const res = await db.execute<{ count: number; reset_at: Date }>(sql`
      INSERT INTO rate_limit_buckets (key, count, reset_at)
      VALUES (${key}, 1, now() + make_interval(secs => ${windowSec}))
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rate_limit_buckets.reset_at < now() THEN 1 ELSE rate_limit_buckets.count + 1 END,
        reset_at = CASE WHEN rate_limit_buckets.reset_at < now() THEN now() + make_interval(secs => ${windowSec}) ELSE rate_limit_buckets.reset_at END
      RETURNING count, reset_at`);
    const row = res.rows[0];
    const count = Number(row.count);
    const retryAfterSec = Math.max(1, Math.ceil((new Date(row.reset_at).getTime() - Date.now()) / 1000));
    // opportunistic cleanup
    if (Math.random() < 0.02) await db.execute(sql`DELETE FROM rate_limit_buckets WHERE reset_at < now() - interval '1 day'`);
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfterSec };
  } catch {
    return { allowed: true, remaining: limit, retryAfterSec: 0 };
  }
}
