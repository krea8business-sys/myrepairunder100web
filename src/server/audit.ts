import "server-only";
import { db, schema } from "@/db";
import type { CurrentAdmin } from "./admin-auth";
import { logError } from "./http";

export async function audit(admin: CurrentAdmin | null, action: string, entity: string, entityId?: string | null, details?: unknown) {
  try {
    await db.insert(schema.auditLogs).values({
      adminId: admin?.id ?? null,
      adminName: admin?.name ?? "system",
      action,
      entity,
      entityId: entityId ?? null,
      details: details === undefined ? null : (details as object),
    });
  } catch (e) {
    logError("audit", e);
  }
}
