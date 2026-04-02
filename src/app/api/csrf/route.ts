import { NextResponse } from "next/server";
import { getOrGenerateCsrfToken } from "@/lib/csrf";

/**
 * GET /api/csrf - Get or generate a CSRF token
 * This endpoint is called by the client to obtain a CSRF token
 * for including in subsequent state-changing requests
 */
export async function GET() {
  try {
    const token = await getOrGenerateCsrfToken();
    
    return NextResponse.json({
      token,
    });
  } catch (error) {
    console.error("Failed to generate CSRF token:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}
