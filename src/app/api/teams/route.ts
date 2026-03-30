import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError } from "@/lib/session";
import { slugify } from "@/lib/tenant";

export async function GET() {
  try {
    const user = await requireSession();

    if (user.isSuperAdmin) {
      const teams = await prisma.team.findMany({
        include: { _count: { select: { memberships: true } } },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(teams.map((t) => ({ id: t.id, name: t.name, createdAt: t.createdAt, memberCount: t._count.memberships })));
    }

    const memberships = await prisma.teamMembership.findMany({
      where: { userId: user.id },
      include: { team: { include: { _count: { select: { memberships: true } } } } },
    });

    return NextResponse.json(memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      createdAt: m.team.createdAt,
      memberCount: m.team._count.memberships,
      role: m.role,
    })));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    if (!user.isSuperAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Team name is required" }, { status: 400 });

    const slug = slugify(name.trim());
    const team = await prisma.team.create({ data: { name: name.trim(), slug } });
    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
