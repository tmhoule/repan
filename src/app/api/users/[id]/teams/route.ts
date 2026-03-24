import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager, handleApiError } from "@/lib/session";

// PUT: Sync user's team memberships — set exactly these teams
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const { teamIds } = await request.json();

    if (!Array.isArray(teamIds)) {
      return NextResponse.json({ error: "teamIds must be an array" }, { status: 400 });
    }

    // Get current memberships
    const current = await prisma.teamMembership.findMany({
      where: { userId: id },
      select: { id: true, teamId: true },
    });
    const currentTeamIds = new Set(current.map((m) => m.teamId));
    const desiredTeamIds = new Set(teamIds as string[]);

    // Remove memberships not in desired set
    const toRemove = current.filter((m) => !desiredTeamIds.has(m.teamId));
    if (toRemove.length > 0) {
      await prisma.teamMembership.deleteMany({
        where: { id: { in: toRemove.map((m) => m.id) } },
      });
    }

    // Add new memberships
    const toAdd = teamIds.filter((tid: string) => !currentTeamIds.has(tid));
    if (toAdd.length > 0) {
      await prisma.teamMembership.createMany({
        data: toAdd.map((teamId: string) => ({ userId: id, teamId, role: "member" as const })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
