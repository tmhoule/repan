import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const teamId = await requireTeam();
    const params = request.nextUrl.searchParams;

    const assignedTo = params.get("assignedTo");
    const bucketId = params.get("bucketId");
    const fromDate = params.get("from");
    const toDate = params.get("to");

    const where: any = {
      teamId,
      status: "done",
      completedAt: { not: null },
      archivedAt: null,
    };

    if (assignedTo) where.assignedToId = assignedTo;
    if (bucketId) where.bucketId = bucketId === "uncategorized" ? null : bucketId;
    if (fromDate || toDate) {
      where.completedAt = {};
      if (fromDate) where.completedAt.gte = new Date(fromDate);
      if (toDate) {
        const to = new Date(toDate);
        to.setDate(to.getDate() + 1); // Include the full day
        where.completedAt.lte = to;
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        title: true,
        priority: true,
        effortEstimate: true,
        completedAt: true,
        startedAt: true,
        createdAt: true,
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
        bucket: { select: { id: true, name: true, colorKey: true } },
      },
      take: 200,
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error);
  }
}
