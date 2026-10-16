import { endAdminSession } from "@/server/admin-auth";
import { ok } from "@/server/http";

export async function POST() {
  await endAdminSession();
  return ok({ ok: true });
}
