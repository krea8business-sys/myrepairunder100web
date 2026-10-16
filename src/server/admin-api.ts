import "server-only";
import { ZodError } from "zod";
import { AuthError, requireAdminApi, type CurrentAdmin } from "./admin-auth";
import type { AdminRole } from "./admin-session";
import { fail, logError, validationFail } from "./http";

export class ApiError extends Error {
  constructor(public status: number, message: string, public extra: Record<string, unknown> = {}) {
    super(message);
  }
}

/** Wraps an admin route handler: role check, error mapping, no stack traces leaked. */
export function adminRoute<C>(role: AdminRole, handler: (req: Request, admin: CurrentAdmin, ctx: C) => Promise<Response>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (req: Request, ctx: any): Promise<Response> => {
    try {
      const admin = await requireAdminApi(role);
      return await handler(req, admin, ctx as C);
    } catch (e) {
      if (e instanceof AuthError) return fail(e.status, e.message);
      if (e instanceof ZodError) return validationFail(e);
      if (e instanceof ApiError) return fail(e.status, e.message, e.extra);
      if (e instanceof Error && e.message === "INVALID_JSON") return fail(400, "Invalid request body");
      if (e instanceof Error && e.message === "PAYLOAD_TOO_LARGE") return fail(413, "Request too large");
      const code = (e as { code?: string })?.code;
      if (code === "23505") return fail(409, "That value is already in use (must be unique).");
      if (code === "23503") return fail(409, "This item is referenced by other records and can't be removed. Archive or deactivate it instead.");
      logError(`admin ${req.method} ${new URL(req.url).pathname}`, e);
      return fail(500, "Something went wrong. Please try again.");
    }
  };
}
