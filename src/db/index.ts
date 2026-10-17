import "server-only";
import { getDatabase } from "@netlify/database";
import { Pool as NeonPool, type NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __mruDb?: DB };

/**
 * Connection selection:
 *  1. DATABASE_URL set → node-postgres pool (local dev, Render, VPS, any long-running server).
 *  2. Netlify Database inside Netlify Functions (serverless):
 *     - normal queries go over Neon's stateless HTTP driver (no sockets that can go stale
 *       while the function is frozen between requests);
 *     - transactions open a FRESH WebSocket pool, run, and close it again.
 *  3. Netlify Database during builds / long-running → pg pool from @netlify/database.
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
      const http = drizzleHttp(netlifyDb.httpClient as unknown as NeonQueryFunction<false, false>, { schema });
      const transaction: DB["transaction"] = async (fn, config) => {
        const pool = new NeonPool({ connectionString: netlifyDb.connectionString, max: 1 });
        try {
          const txDb = drizzleNeon(pool, { schema }) as unknown as DB;
          return await txDb.transaction(fn, config);
        } finally {
          await pool.end().catch(() => {});
        }
      };
      return new Proxy(http, {
        get(target, prop, receiver) {
          if (prop === "transaction") return transaction;
          return Reflect.get(target, prop, receiver);
        },
      }) as unknown as DB;
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
