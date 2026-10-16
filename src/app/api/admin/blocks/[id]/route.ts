import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { adminRoute } from "@/server/admin-api";
import { audit } from "@/server/audit";
import { ok } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = adminRoute<Ctx>("MANAGER", async (_req, admin, { params }) => {
  const { id } = await params;
  await db.delete(schema.blockedPeriods).where(eq(schema.blockedPeriods.id, id));
  await audit(admin, "block.delete", "schedule", id);
  return ok({ ok: true });
});
