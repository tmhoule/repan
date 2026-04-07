import { NextResponse } from "next/server";
import { getSession, setSession } from "@/lib/session";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  // Refresh the session token timestamp (touch)
  await setSession(user.id);

  return NextResponse.json({ valid: true });
}
