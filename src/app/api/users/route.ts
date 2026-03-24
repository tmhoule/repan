import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager, getSession, getActiveTeam, handleApiError } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    // GET is public so the login page can fetch the user list without a session.
    // Managers can optionally include inactive users.
    const session = await getSession();
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
    const allTeams = request.nextUrl.searchParams.get("allTeams") === "true";
    const teamId = await getActiveTeam();

    // If allTeams is requested (for admin add-member), skip team filtering
    // If there's an active team and user is logged in, filter by team members
    if (teamId && session && !allTeams) {
      const memberships = await prisma.teamMembership.findMany({
        where: { teamId },
        include: {
          user: {
            select: { id: true, name: true, role: true, avatarColor: true, isActive: true, createdAt: true },
          },
        },
        orderBy: { user: { name: "asc" } },
      });

      let users = memberships.map((m) => m.user);
      if (!includeInactive || session.role !== "manager") {
        users = users.filter((u) => u.isActive);
      }

      return NextResponse.json(users);
    }

    const where = (includeInactive && session?.role === "manager")
      ? {}
      : { isActive: true };

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true, avatarColor: true, isActive: true, createdAt: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireManager();
    const activeTeamId = await getActiveTeam();
    const { name, role, avatarColor, teamIds } = await request.json();
    const user = await prisma.user.create({
      data: { name, role: role || "staff", avatarColor },
    });

    // Add user to specified teams, or fall back to active team
    const teamsToJoin: string[] = Array.isArray(teamIds) && teamIds.length > 0
      ? teamIds
      : activeTeamId ? [activeTeamId] : [];

    if (teamsToJoin.length > 0) {
      await prisma.teamMembership.createMany({
        data: teamsToJoin.map((tid: string) => ({ userId: user.id, teamId: tid, role: "member" as const })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
