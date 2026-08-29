import { NextResponse, type NextRequest } from "next/server";

/**
 * A fast redirect, not a control.
 *
 * This runs at the edge of every matched request (the `proxy.ts` convention
 * that replaced `middleware.ts` in Next 16). It sees only whether a session
 * cookie is present — it cannot tell whether that cookie is valid, whose it
 * is, or what role it carries, and it must not pretend to. Its only job is to
 * save a signed-out visitor a page load.
 *
 * The authority is `requireUser` / `requireRole`, called on the server inside
 * every protected page and every protected route handler. If this file were
 * deleted, nothing would become accessible that is not accessible now.
 */

const PROTECTED = ["/dashboard", "/account", "/employer", "/governance"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  if (request.cookies.has("nivaaran_session")) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*", "/employer/:path*", "/governance/:path*"],
};
