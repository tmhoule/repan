import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const CSRF_COOKIE_NAME = "repan_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
const CSRF_TOKEN_LENGTH = 32; // 256 bits

/**
 * Generate a new CSRF token and set it in a cookie
 */
export async function generateCsrfToken(): Promise<string> {
  // Dynamic import to avoid pulling Node.js crypto into Edge Middleware
  const { generateRandomToken } = await import("./crypto");
  const token = generateRandomToken(CSRF_TOKEN_LENGTH);
  const cookieStore = await cookies();
  
  const isSecure = process.env.NODE_ENV === "production" && !process.env.DISABLE_SECURE_COOKIES;
  
  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be accessible to JavaScript for inclusion in requests
    secure: isSecure,
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });
  
  return token;
}

/**
 * Get the current CSRF token from cookies
 */
export async function getCsrfToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_COOKIE_NAME);
  return token?.value || null;
}

/**
 * Verify CSRF token from request
 * Checks the custom header against the cookie value
 */
export async function verifyCsrfToken(request: NextRequest): Promise<boolean> {
  // Get token from custom header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  
  if (!headerToken) {
    return false;
  }
  
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  
  if (!cookieToken) {
    return false;
  }
  
  // Constant-time comparison (Edge-compatible, no Node.js crypto needed)
  if (headerToken.length !== cookieToken.length) return false;
  let result = 0;
  for (let i = 0; i < headerToken.length; i++) {
    result |= headerToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Middleware helper to check CSRF on state-changing requests
 * Returns error response if CSRF check fails
 */
export async function requireCsrfToken(request: NextRequest): Promise<NextResponse | null> {
  const method = request.method.toUpperCase();
  
  // Only check state-changing methods
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return null;
  }
  
  // Skip CSRF check for SAML callback (external POST from IdP)
  if (request.nextUrl.pathname === '/api/auth/saml/callback') {
    return null;
  }
  
  const valid = await verifyCsrfToken(request);
  
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid or missing CSRF token" },
      { status: 403 }
    );
  }
  
  return null;
}

/**
 * Hook to get CSRF token for client-side usage
 * Returns the token from cookie or generates a new one
 */
export async function getOrGenerateCsrfToken(): Promise<string> {
  const existing = await getCsrfToken();
  
  if (existing) {
    return existing;
  }
  
  return await generateCsrfToken();
}
