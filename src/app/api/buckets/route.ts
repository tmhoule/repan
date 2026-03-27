import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";

export async function GET() {
  try {
    await requireSession();
    const teamId = await requireTeam();

    const buckets = await prisma.bucket.findMany({
      where: { teamId },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, colorKey: true, displayOrder: true, _count: { select: { tasks: true } } },
    });

    return NextResponse.json({ buckets, teamId });
  } catch (error) {
    return handleApiError(error);
  }
}
