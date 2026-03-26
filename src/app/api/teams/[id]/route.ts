import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError } from "@/lib/session";
import { getTeamRole } from "@/lib/team-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;

    // Must be super_admin or a member of the team
    const role = await getTeamRole(user.id, id);
    if (!user.isSuperAdmin && !role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, avatarColor: true, role: true, isActive: true } } },
        },
      },
    });
    if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(team);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;

    const role = await getTeamRole(user.id, id);
    if (!user.isSuperAdmin && role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Team name is required" }, { status: 400 });

    const team = await prisma.team.update({ where: { id }, data: { name: name.trim() } });
    return NextResponse.json(team);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    // Check for tasks still assigned to this team
    const taskCount = await prisma.task.count({ where: { teamId: id } });
    if (taskCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete team — it still has ${taskCount} task${taskCount !== 1 ? "s" : ""}. Reassign or archive them first.` },
        { status: 409 },
      );
    }

    // Remove memberships first, then delete the team
    await prisma.teamMembership.deleteMany({ where: { teamId: id } });
    await prisma.team.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
