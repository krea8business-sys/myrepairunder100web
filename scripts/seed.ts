/**
 * Seeds starter data. Idempotent: only inserts rows that don't exist, so admin edits are preserved.
 *   npm run db:seed            → insert missing starter data
 *   npm run db:seed -- --reset → wipe catalogue/areas/slots/bookings and re-seed (DEV ONLY)
 * Creates the first OWNER admin from ADMIN_EMAIL / ADMIN_PASSWORD if no admin exists.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { DEFAULT_POLICIES, SEED_AREAS, SEED_CATEGORIES, SEED_FAQS, SEED_SLOTS } from "../src/db/seed-data";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  const db = drizzle(pool, { schema });

  if (process.argv.includes("--reset")) {
    if (process.env.NODE_ENV === "production") throw new Error("Refusing to reset in production");
    await db.execute(sql`TRUNCATE bookings, booking_items, booking_events, technician_assignments, notification_logs, services, categories, service_areas, area_categories, time_slots, blocked_periods, technicians, technician_skills, rate_limit_buckets, audit_logs, business_settings CASCADE`);
    console.log("• Reset data");
  }

  // Starter data is inserted only on the very first run (when no settings row exists yet), so this script
  // is safe to run on every server start: it never re-creates things an admin deleted later.
  const firstRun = (await db.select({ id: schema.businessSettings.id }).from(schema.businessSettings).limit(1)).length === 0;
  if (firstRun || process.argv.includes("--reset") || process.argv.includes("--starter")) {
    await seedStarterData(db);
  } else {
    console.log("• Starter data already present — skipped (use --starter to add missing items)");
  }

  await ensureAdmin(db);
  await pool.end();
  console.log("✓ Seed complete");
}

type DB = ReturnType<typeof drizzle<typeof schema>>;

async function seedStarterData(db: DB) {
  // Settings
  await db
    .insert(schema.businessSettings)
    .values({
      id: "default",
      ...DEFAULT_POLICIES,
      faqs: SEED_FAQS,
      visitFee: 0,
      visitFeeIsDemo: true,
      supportHours: "Mon–Sat, 9:00 AM – 7:00 PM",
      // Business contact numbers (editable in Admin → Settings)
      supportPhone: "+91 78272 01114",
      whatsappNumber: "+91 92110 10110",
    })
    .onConflictDoNothing();

  // Catalogue
  let order = 0;
  for (const c of SEED_CATEGORIES) {
    const { services, ...cat } = c;
    await db.insert(schema.categories).values({ ...cat, sortOrder: order++ }).onConflictDoNothing({ target: schema.categories.slug });
    const [row] = await db.select().from(schema.categories).where(eq(schema.categories.slug, c.slug));
    let sOrder = 0;
    for (const s of services) {
      const exists = await db.select({ id: schema.services.id }).from(schema.services).where(and(eq(schema.services.categoryId, row.id), eq(schema.services.slug, s.slug)));
      if (exists.length) { sOrder++; continue; }
      await db.insert(schema.services).values({
        categoryId: row.id,
        slug: s.slug,
        name: s.name,
        shortDescription: s.shortDescription,
        description: s.description,
        priceType: s.priceType,
        price: s.price,
        priceIsDemo: true,
        inclusions: s.inclusions,
        exclusions: s.exclusions,
        partsExtra: s.partsExtra ?? true,
        requiresDiagnosis: s.requiresDiagnosis ?? false,
        durationMinutes: s.durationMinutes ?? null,
        allowQuantity: s.allowQuantity ?? true,
        maxQuantity: s.maxQuantity ?? 5,
        popular: s.popular ?? false,
        sortOrder: sOrder++,
      });
    }
  }
  console.log(`• Catalogue: ${SEED_CATEGORIES.length} categories, ${SEED_CATEGORIES.reduce((n, c) => n + c.services.length, 0)} services`);

  // Areas
  for (const a of SEED_AREAS) {
    await db.insert(schema.serviceAreas).values({ ...a, slug: slugify(a.locality), publishPage: a.publishPage ?? false, pageIntro: a.pageIntro ?? null }).onConflictDoNothing();
  }
  console.log(`• Service areas: ${SEED_AREAS.length}`);

  // Slots
  const haveSlots = await db.select({ n: sql<number>`count(*)::int` }).from(schema.timeSlots);
  if (Number(haveSlots[0].n) === 0) {
    await db.insert(schema.timeSlots).values(SEED_SLOTS.map((s, i) => ({ ...s, sortOrder: i })));
    console.log(`• Time slots: ${SEED_SLOTS.length}`);
  }

  // Demo technicians (clearly marked)
  const haveTech = await db.select({ n: sql<number>`count(*)::int` }).from(schema.technicians);
  if (Number(haveTech[0].n) === 0) {
    const cats = await db.select().from(schema.categories);
    const t1 = await db.insert(schema.technicians).values({ name: "Demo Technician One", phone: "0000000000", pincodes: ["110084", "110009", "110054"], localities: ["Burari", "Mukherjee Nagar"], notes: "DEMO record — replace with a real technician." }).returning();
    const t2 = await db.insert(schema.technicians).values({ name: "Demo Technician Two", phone: "0000000000", pincodes: ["110033", "110034", "110085", "110088"], localities: ["Pitampura", "Rohini"], notes: "DEMO record — replace with a real technician." }).returning();
    const ac = cats.find((c) => c.slug === "ac-repair-service");
    await db.insert(schema.technicianSkills).values([
      ...cats.map((c) => ({ technicianId: t1[0].id, categoryId: c.id })),
      ...(ac ? [{ technicianId: t2[0].id, categoryId: ac.id }] : []),
    ]);
    console.log("• Demo technicians: 2");
  }

}

async function ensureAdmin(db: DB) {
  // First admin
  const admins = await db.select({ n: sql<number>`count(*)::int` }).from(schema.adminUsers);
  if (Number(admins[0].n) === 0) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (email && password && password.length >= 12) {
      await db.insert(schema.adminUsers).values({ email, name: "Owner", role: "OWNER", passwordHash: await bcrypt.hash(password, 12) });
      console.log(`• Admin created: ${email} (OWNER)`);
    } else {
      console.log("• No admin created. Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ chars) and re-run, or use `npm run admin:create`.");
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
