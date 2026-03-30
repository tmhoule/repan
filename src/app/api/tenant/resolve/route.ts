import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractSubdomain } from "@/lib/tenant";

const TEAM_COOKIE = "repan_team";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

/**
 * GET /api/tenant/resolve
 *
 * Resolves the tenant team from the current subdomain and sets the team cookie.
 * Redirects to the requested path (default: /tasks).
 */
export async function GET(request: NextRequest) {
  const host = request.headers.get("host");
  const slug = extractSubdomain(host);
  const redirect = request.nextUrl.searchParams.get("redirect") ?? "/tasks";

  if (!slug) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const team = await prisma.team.findUnique({ where: { slug } });
  if (!team) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const isSecure =
    process.env.NODE_ENV === "production" &&
    !process.env.DISABLE_SECURE_COOKIES;

  const response = NextResponse.redirect(new URL(redirect, request.url));
  response.cookies.set(TEAM_COOKIE, team.id, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return response;
}
