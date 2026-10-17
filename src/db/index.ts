import "server-only";
import { getDatabase } from "@netlify/database";
import type { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __mruDb?: DB };

/**
 * Connection selection:
 *  1. DATABASE_URL set → node-postgres (local dev, Render, VPS, any Postgres host).
 *  2. Running on Netlify with Netlify Database (NETLIFY_DB_URL injected) → Netlify's own client:
 *     the Neon serverless pool inside Netlify Functions, a pg pool during builds.
 */
function createDb(): DB {
  const url = process.env.DATABASE_URL;
  if (url) {
    const pool = new Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
    return drizzle(pool, { schema });
  }
  if (process.env.NETLIFY_DB_URL) {
    const netlifyDb = getDatabase();
    if (netlifyDb.driver === "serverless") {
      // Same query API as node-postgres; typed as DB for the rest of the app.
      return drizzleNeon(netlifyDb.pool as NeonPool, { schema }) as unknown as DB;
    }
    return drizzle(netlifyDb.pool as Pool, { schema });
  }
  throw new Error("No database configured. Set DATABASE_URL (or enable Netlify Database on Netlify).");
}

export function getDb(): DB {
  if (!globalForDb.__mruDb) globalForDb.__mruDb = createDb();
  return globalForDb.__mruDb;
}

export const db = new Proxy({} as DB, {
  get(_t, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const v = real[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(real) : v;
  },
});

export { schema };
