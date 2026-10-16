import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { adminRoute } from "@/server/admin-api";
import { slotInput } from "@/server/admin-schemas";
import { audit } from "@/server/audit";
import { ok, readJson } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = adminRoute<Ctx>("MANAGER", async (req, admin, { params }) => {
  const { id } = await params;
  const data = slotInput.parse(await readJson(req));
  await db.update(schema.timeSlots).set(data).where(eq(schema.timeSlots.id, id));
  await audit(admin, "slot.update", "slot", id, data);
  return ok({ ok: true });
});

/** Existing bookings keep their slot label; the slot reference is cleared. */
export const DELETE = adminRoute<Ctx>("MANAGER", async (_req, admin, { params }) => {
  const { id } = await params;
  await db.delete(schema.timeSlots).where(eq(schema.timeSlots.id, id));
  await audit(admin, "slot.delete", "slot", id);
  return ok({ ok: true });
});
