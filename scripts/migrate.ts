/**
 * Applies SQL migrations in /drizzle to DATABASE_URL. Safe to run on every deploy.
 *
 * Safety guard: if the database already contains tables that were NOT created by this app's
 * migrations (e.g. it belongs to a different application), it refuses to touch anything and
 * lists what it found. Override only if you are sure: MIGRATE_ALLOW_NON_EMPTY=true
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  const info = await pool.query<{ db: string; usr: string; version: string }>("select current_database() as db, current_user as usr, version() as version");
  console.log(`• Database: ${info.rows[0].db} (user ${info.rows[0].usr}) — ${info.rows[0].version.split(",")[0]}`);

  const journal = await pool.query<{ n: string }>(
    `select count(*)::text as n from information_schema.tables where table_schema = 'drizzle' and table_name = '__drizzle_migrations'`,
  );
  const applied = journal.rows[0].n !== "0" ? Number((await pool.query<{ n: string }>(`select count(*)::text as n from drizzle.__drizzle_migrations`)).rows[0].n) : 0;
  const tables = await pool.query<{ table_name: string }>(
    `select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by table_name`,
  );
  const types = await pool.query<{ typname: string }>(
    `select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typtype = 'e' order by 1`,
  );
  console.log(`• Migrations already applied: ${applied}`);
  console.log(`• Existing tables (${tables.rows.length}): ${tables.rows.map((r) => r.table_name).join(", ") || "none"}`);
  console.log(`• Existing enum types (${types.rows.length}): ${types.rows.map((r) => r.typname).join(", ") || "none"}`);

  if (applied === 0 && (tables.rows.length > 0 || types.rows.length > 0) && process.env.MIGRATE_ALLOW_NON_EMPTY !== "true") {
    console.error(
      "\n✗ STOPPED: this database is not empty and was not set up by this website.\n" +
        "  It probably belongs to another app. Nothing has been changed.\n" +
        "  Connect this website to its own, new database (see DATABASE_URL), then deploy again.\n",
    );
    await pool.end();
    process.exit(1);
  }

  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
  console.log("✓ Migrations applied");
}

main().catch((e) => {
  const cause = (e as { cause?: { message?: string; code?: string } }).cause;
  console.error("Migration failed:", (e as Error).message.split("\n")[0]);
  if (cause) console.error("  Cause:", cause.code ?? "", cause.message ?? "");
  process.exit(1);
});
