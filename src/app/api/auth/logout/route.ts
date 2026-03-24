import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("repan_session");
  response.cookies.delete("repan_team");
  return response;
}
