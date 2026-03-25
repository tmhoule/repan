import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/session";

const SESSION_COOKIE = "repan_session";
const TEAM_COOKIE = "repan_team";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  try {
  const { userId } = await request.json();
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    include: {
      teamMemberships: {
        include: { team: { select: { id: true, name: true } } },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const teams = user.teamMemberships.map((m) => ({
    id: m.team.id,
    name: m.team.name,
    role: m.role,
  }));

  // Effective role: if user is on exactly one team, use that team's role
  let effectiveRole = user.role;
  if (teams.length === 1 && teams[0].role === "manager") effectiveRole = "manager";
  if (user.isSuperAdmin) effectiveRole = "manager";

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, role: effectiveRole, avatarColor: user.avatarColor, isSuperAdmin: user.isSuperAdmin },
    teams,
  });

  const isSecure = process.env.NODE_ENV === "production" && !process.env.DISABLE_SECURE_COOKIES;
  response.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  // Auto-set team cookie if user belongs to exactly one team
  if (teams.length === 1) {
    response.cookies.set(TEAM_COOKIE, teams[0].id, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  }

  return response;
  } catch (error) {
    return handleApiError(error);
  }
}
