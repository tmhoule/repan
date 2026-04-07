import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  // Only check validity — do NOT touch/refresh the session here.
  // Polling this endpoint should not count as user activity.
  // Real user activity (API calls via requireSession) refreshes the token.
  return NextResponse.json({ valid: true });
}
