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

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!body.name?.trim()) return NextResponse.json({ error: "Team name is required" }, { status: 400 });
      data.name = body.name.trim();
    }

    if (body.weightHigh !== undefined) {
      const v = Number(body.weightHigh);
      if (!Number.isInteger(v) || v < 1) return NextResponse.json({ error: "weightHigh must be a positive integer" }, { status: 400 });
      data.weightHigh = v;
    }
    if (body.weightMedium !== undefined) {
      const v = Number(body.weightMedium);
      if (!Number.isInteger(v) || v < 1) return NextResponse.json({ error: "weightMedium must be a positive integer" }, { status: 400 });
      data.weightMedium = v;
    }
    if (body.weightLow !== undefined) {
      const v = Number(body.weightLow);
      if (!Number.isInteger(v) || v < 1) return NextResponse.json({ error: "weightLow must be a positive integer" }, { status: 400 });
      data.weightLow = v;
    }
    if (body.multiplierBlocked !== undefined) {
      const v = Number(body.multiplierBlocked);
      if (!Number.isInteger(v) || v < 0 || v > 100) return NextResponse.json({ error: "multiplierBlocked must be 0–100" }, { status: 400 });
      data.multiplierBlocked = v;
    }
    if (body.multiplierStalled !== undefined) {
      const v = Number(body.multiplierStalled);
      if (!Number.isInteger(v) || v < 0 || v > 100) return NextResponse.json({ error: "multiplierStalled must be 0–100" }, { status: 400 });
      data.multiplierStalled = v;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const team = await prisma.team.update({ where: { id }, data });
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
