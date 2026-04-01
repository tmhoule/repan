import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateSamlResponse } from "@/lib/saml";
import { setSession, setActiveTeam } from "@/lib/session";

const AVATAR_COLORS = [
  "#8B5CF6", "#06B6D4", "#10B981", "#F59E0B", "#EF4444",
  "#EC4899", "#6366F1", "#14B8A6", "#F97316", "#84CC16",
];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const samlResponse = formData.get("SAMLResponse") as string;
    if (!samlResponse) {
      return NextResponse.redirect(new URL("/login?error=missing_response", request.url));
    }

    const { uid, displayName } = await validateSamlResponse(samlResponse);

    // Look up existing SSO user
    let user = await prisma.user.findUnique({ where: { ssoUid: uid } });

    if (user) {
      // Update display name if SAML provides one and it differs
      if (displayName && displayName !== user.name) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: displayName },
        });
      }
    } else {
      // JIT provision new user
      const name = displayName || uid;
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

    // Set session
    await setSession(user.id);

    // Check team memberships for redirect
    const memberships = await prisma.teamMembership.findMany({
      where: { userId: user.id },
      select: { teamId: true },
    });

    if (memberships.length === 1) {
      await setActiveTeam(memberships[0].teamId);
      return NextResponse.redirect(new URL("/tasks", request.url));
    }

    // No teams or multiple teams — go to team select
    return NextResponse.redirect(new URL("/team-select", request.url));
  } catch (error) {
    console.error("SAML callback error:", error);
    return NextResponse.redirect(new URL("/login?error=sso_failed", request.url));
  }
}
