import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "./server/admin-session";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * 1. CSRF: reject cross-origin state-changing API requests (Origin must match Host).
 * 2. Admin gate: /admin/* and /api/admin/* require a valid signed admin session.
 *    (Every admin route ALSO re-checks the admin + role against the database.)
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/") && MUTATING.has(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (origin) {
      let originHost = "";
      try {
        originHost = new URL(origin).host;
      } catch {
        /* invalid origin */
      }
      if (originHost !== host) {
        return NextResponse.json({ error: "Cross-origin request blocked" }, { status: 403 });
      }
    } else if (pathname.startsWith("/api/admin/")) {
      // Browsers always send Origin on cross-site POSTs; require it for admin mutations.
      return NextResponse.json({ error: "Missing origin" }, { status: 403 });
    }
  }

  const isAdminPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin/") && pathname !== "/api/admin/login";
  if (isAdminPage || isAdminApi) {
    const session = await verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!session) {
      if (isAdminApi) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
