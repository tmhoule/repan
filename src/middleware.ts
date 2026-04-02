import { NextRequest, NextResponse } from "next/server";
import { requireCsrfToken } from "./lib/csrf";

export async function middleware(request: NextRequest) {
  const session = request.cookies.get("repan_session");
  const team = request.cookies.get("repan_team");
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isTeamSelectPage = pathname === "/team-select";
  const isApiRoute = pathname.startsWith("/api");

  // Check CSRF token for API routes with state-changing methods
  if (isApiRoute && session) {
    const csrfError = await requireCsrfToken(request);
    if (csrfError) {
      return csrfError;
    }
  }

  // Unauthenticated users: redirect to login (except on login page and API routes)
  if (!session && !isLoginPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated users on login page: redirect to tasks (or team-select)
  if (session && isLoginPage) {
    if (!team) {
      return NextResponse.redirect(new URL("/team-select", request.url));
    }
    return NextResponse.redirect(new URL("/tasks", request.url));
  }

  // Authenticated users with no team: redirect to team-select (unless already there or on API)
  if (session && !team && !isTeamSelectPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/team-select", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
