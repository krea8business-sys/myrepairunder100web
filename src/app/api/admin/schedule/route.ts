import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { adminRoute } from "@/server/admin-api";
import { scheduleInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";
import { loadSettings } from "@/server/settings";

export const PATCH = adminRoute("MANAGER", async (req, admin) => {
  const data = scheduleInput.parse(await readJson(req));
  await loadSettings();
  await db.update(schema.businessSettings).set(data).where(eq(schema.businessSettings.id, "default"));
  await audit(admin, "schedule.update", "settings", "default", data);
  return ok({ ok: true });
});
