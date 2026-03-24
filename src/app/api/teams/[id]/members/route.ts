import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError } from "@/lib/session";
import { getTeamRole } from "@/lib/team-auth";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;

    const role = await getTeamRole(user.id, id);
    if (!user.isSuperAdmin && !role) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const memberships = await prisma.teamMembership.findMany({
      where: { teamId: id },
      include: { user: { select: { id: true, name: true, avatarColor: true, role: true, isActive: true } } },
      orderBy: { user: { name: "asc" } },
    });

    return NextResponse.json(memberships);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;

    const role = await getTeamRole(user.id, id);
    if (!user.isSuperAdmin && role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, role: memberRole } = await request.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    const membership = await prisma.teamMembership.upsert({
      where: { userId_teamId: { userId, teamId: id } },
      update: { role: memberRole || "member" },
      create: { userId, teamId: id, role: memberRole || "member" },
      include: { user: { select: { id: true, name: true, avatarColor: true } } },
    });

    return NextResponse.json(membership, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;

    const role = await getTeamRole(user.id, id);
    if (!user.isSuperAdmin && role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: "userId is required" }, { status: 400 });

    await prisma.teamMembership.delete({
      where: { userId_teamId: { userId, teamId: id } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
