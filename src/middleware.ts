import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("repan_session");
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  if (!session && !isLoginPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/tasks", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
