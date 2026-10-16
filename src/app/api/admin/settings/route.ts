import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { adminRoute } from "@/server/admin-api";
import { settingsInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";
import { loadSettings } from "@/server/settings";

export const PATCH = adminRoute("OWNER", async (req, admin) => {
  const data = settingsInput.parse(await readJson(req, 120_000));
  const before = await loadSettings();
  await db.update(schema.businessSettings).set(data).where(eq(schema.businessSettings.id, "default"));
  const changed = Object.keys(data).filter((k) => JSON.stringify(before[k as keyof typeof before]) !== JSON.stringify(data[k as keyof typeof data]));
  await audit(admin, "settings.update", "settings", "default", { changed });
  return ok({ ok: true });
});
