import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError } from "@/lib/session";

const TEAM_COOKIE = "repan_team";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const { teamId } = await request.json();
    if (!teamId) return NextResponse.json({ error: "teamId is required" }, { status: 400 });

    // Validate that the user is actually a member of this team (or super_admin)
    if (!user.isSuperAdmin) {
      const membership = await prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: user.id, teamId } },
      });
      if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const isSecure = process.env.NODE_ENV === "production" && !process.env.DISABLE_SECURE_COOKIES;
    const response = NextResponse.json({ success: true, team: { id: team.id, name: team.name } });
    response.cookies.set(TEAM_COOKIE, teamId, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
