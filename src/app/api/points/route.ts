import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const userId = user.id;

    const [points, total] = await Promise.all([
      prisma.pointsLedger.findMany({
        where: { userId }, orderBy: { timestamp: "desc" }, take: 50,
        include: { task: { select: { id: true, title: true } } },
      }),
      prisma.pointsLedger.aggregate({ where: { userId }, _sum: { points: true } }),
    ]);

    return NextResponse.json({ points, totalPoints: total._sum.points || 0 });
  } catch (error) {
    return handleApiError(error);
  }
}
