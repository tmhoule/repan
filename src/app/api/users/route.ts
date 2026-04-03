import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
            select: { id: true, name: true, role: true, avatarColor: true, isActive: true, isSuperAdmin: true, ssoUser: true, createdAt: true },
          },
        },
        orderBy: { user: { name: "asc" } },
      });

      let users = memberships.map((m) => m.user);
      const membership = teamId ? memberships.find((m) => m.userId === session.id) : null;
      const isManager = session.isSuperAdmin || membership?.role === "manager";
      if (!includeInactive || !isManager) {
        users = users.filter((u) => u.isActive);
      }

      return NextResponse.json(users);
    }

    const where = (includeInactive && session?.isSuperAdmin)
      ? {}
      : { isActive: true };

    if (allTeams) {
      const usersWithTeams = await prisma.user.findMany({
        where,
        select: {
          id: true, name: true, role: true, avatarColor: true, isActive: true, isSuperAdmin: true, ssoUser: true, createdAt: true,
          teamMemberships: { select: { team: { select: { id: true, name: true } } } },
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(usersWithTeams.map((u) => ({
        id: u.id, name: u.name, role: u.role, avatarColor: u.avatarColor,
        isActive: u.isActive, isSuperAdmin: u.isSuperAdmin, ssoUser: u.ssoUser, createdAt: u.createdAt,
        teams: u.teamMemberships.map((m) => m.team),
      })));
    }

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, role: true, avatarColor: true, isActive: true, isSuperAdmin: true, ssoUser: true, createdAt: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireManager();
    const activeTeamId = await getActiveTeam();
    const { name, role, avatarColor, teamIds, isSuperAdmin, password, ssoUid } = await request.json();

    // If ssoUid is provided, validate it's not already taken
    if (ssoUid) {
      const existing = await prisma.user.findUnique({ where: { ssoUid } });
      if (existing) {
        return NextResponse.json({ error: "An account with this SSO UID already exists." }, { status: 409 });
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        role: role || "staff",
        avatarColor,
        // Only super admins can create other super admins
        ...(isSuperAdmin && currentUser.isSuperAdmin ? { isSuperAdmin: true } : {}),
        ...(password && !ssoUid ? { passwordHash: await bcrypt.hash(password, 10) } : {}),
        ...(ssoUid ? { ssoUid, ssoUser: true } : {}),
      },
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
