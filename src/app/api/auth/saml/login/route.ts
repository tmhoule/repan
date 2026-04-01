import { NextResponse } from "next/server";
import { createSamlRedirectUrl } from "@/lib/saml";

export async function GET() {
  try {
    const url = await createSamlRedirectUrl();
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not configured")) {
      return NextResponse.json({ error: "SSO is not enabled" }, { status: 404 });
    }
    console.error("SAML login error:", error);
    return NextResponse.json({ error: "Failed to initiate SSO login" }, { status: 500 });
  }
}
