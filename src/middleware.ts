import { NextRequest, NextResponse } from "next/server";

/**
 * Extract tenant subdomain from Host header.
 * Duplicated here because middleware runs in the Edge runtime and
 * cannot import Node-only modules. Kept in sync with src/lib/tenant.ts.
 */
function extractSubdomain(host: string | null, baseDomain: string): string | null {
  if (!host || !baseDomain) return null;
  const hostname = host.split(":")[0].toLowerCase();
  const base = baseDomain.toLowerCase();
  if (!hostname.endsWith(`.${base}`)) return null;
  const sub = hostname.slice(0, -(base.length + 1));
  if (!sub || sub.includes(".")) return null;
  return sub;
}

export function middleware(request: NextRequest) {
  const session = request.cookies.get("repan_session");
  const team = request.cookies.get("repan_team");
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isTeamSelectPage = pathname === "/team-select";
  const isApiRoute = pathname.startsWith("/api");

  const baseDomain = process.env.APP_BASE_DOMAIN ?? "";
  const host = request.headers.get("host");
  const subdomain = extractSubdomain(host, baseDomain);

  // Pass subdomain to downstream server components/API routes via header
  const requestHeaders = new Headers(request.headers);
  if (subdomain) {
    requestHeaders.set("x-tenant-slug", subdomain);
  }

  // Unauthenticated users: redirect to login (except on login page and API routes)
  if (!session && !isLoginPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated users on login page: redirect to tasks (or team-select)
  if (session && isLoginPage) {
    if (subdomain && !team) {
      // On a tenant subdomain with no team cookie — resolve team first
      return NextResponse.redirect(new URL("/api/tenant/resolve?redirect=/tasks", request.url));
    }
    if (!team && !subdomain) {
      return NextResponse.redirect(new URL("/team-select", request.url));
    }
    return NextResponse.redirect(new URL("/tasks", request.url));
  }

  // Authenticated users with no team: auto-resolve from subdomain or redirect to team-select
  if (session && !team && !isTeamSelectPage && !isApiRoute) {
    if (subdomain) {
      return NextResponse.redirect(
        new URL(`/api/tenant/resolve?redirect=${encodeURIComponent(pathname)}`, request.url),
      );
    }
    return NextResponse.redirect(new URL("/team-select", request.url));
  }

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
