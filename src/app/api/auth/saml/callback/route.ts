import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateSamlResponse } from "@/lib/saml";
import { setSession, setActiveTeam } from "@/lib/session";

const AVATAR_COLORS = [
  "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444",
  "#EC4899", "#6366F1", "#14B8A6", "#F97316", "#84CC16",
];

export async function POST(request: NextRequest) {
  const samlConfig = await prisma.samlConfig.findUnique({ where: { id: "singleton" } });
  const baseUrl = samlConfig?.appUrl || request.url;

  try {
    const formData = await request.formData();
    const samlResponse = formData.get("SAMLResponse") as string;
    if (!samlResponse) {
      return NextResponse.redirect(new URL("/login?error=missing_response", baseUrl));
    }

    const { uid, displayName } = await validateSamlResponse(samlResponse);

    // Look up existing SSO user
    let user = await prisma.user.findUnique({ where: { ssoUid: uid } });

    if (!user) {
      // JIT provision new user — handle name collisions with unique constraint
      let name = displayName || uid;
      const existing = await prisma.user.findUnique({ where: { name } });
      if (existing) {
        name = `${name} (${uid})`;
      }
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

      user = await prisma.user.create({
        data: {
          name,
          ssoUid: uid,
          ssoUser: true,
          role: "staff",
          avatarColor,
        },
      });
    }
    // For existing users, don't overwrite name — it's user-editable after provisioning

    // Set session
    await setSession(user.id);

    // Check team memberships for redirect
    const memberships = await prisma.teamMembership.findMany({
      where: { userId: user.id },
      select: { teamId: true },
    });

    if (memberships.length === 1) {
      await setActiveTeam(memberships[0].teamId);
      return NextResponse.redirect(new URL("/tasks", baseUrl));
    }

    // No teams or multiple teams — go to team select
    return NextResponse.redirect(new URL("/team-select", baseUrl));
  } catch (error) {
    console.error("SAML callback error:", error);
    return NextResponse.redirect(new URL("/login?error=sso_failed", baseUrl));
  }
}
