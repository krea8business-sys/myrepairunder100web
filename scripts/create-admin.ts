/** Create or reset an admin: npm run admin:create -- email@example.com "Full Name" OWNER|MANAGER|STAFF
 *  The password is read from the ADMIN_NEW_PASSWORD env var (never pass passwords as CLI args). */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";

async function main() {
  const [email, name = "Admin", role = "STAFF"] = process.argv.slice(2);
  const password = process.env.ADMIN_NEW_PASSWORD;
  if (!email || !password || password.length < 12 || !["OWNER", "MANAGER", "STAFF"].includes(role)) {
    console.error('Usage: ADMIN_NEW_PASSWORD="<12+ chars>" npm run admin:create -- email "Name" OWNER|MANAGER|STAFF');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const db = drizzle(pool, { schema });
  const passwordHash = await bcrypt.hash(password, 12);
  await db
    .insert(schema.adminUsers)
    .values({ email: email.toLowerCase(), name, role: role as "OWNER", passwordHash })
    .onConflictDoUpdate({ target: schema.adminUsers.email, set: { passwordHash, name, role: role as "OWNER", active: true } });
  console.log(`✓ Admin ${email} saved with role ${role}`);
  await pool.end();
}
main().catch((e) => { console.error(e.message); process.exit(1); });
