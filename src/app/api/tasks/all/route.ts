import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireTeam, handleApiError } from "@/lib/session";
import { parseParams, sortTasks } from "@/lib/all-tasks-query";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const teamId = await requireTeam();
    const { where, sort, dir } = parseParams(request.nextUrl.searchParams);

    const tasks = await prisma.task.findMany({
      where: {
        ...where,
        teamId,
        archivedAt: null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
        bucket: { select: { id: true, name: true, colorKey: true } },
      },
    });

    const shaped = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority as "high" | "medium" | "low",
      effortEstimate: t.effortEstimate as "small" | "medium" | "large",
      percentComplete: t.percentComplete,
      dueDate: t.dueDate,
      updatedAt: t.updatedAt,
      assignedTo: t.assignedTo,
      bucket: t.bucket,
    }));

    const sorted = sortTasks(shaped, sort, dir);

    return NextResponse.json({ tasks: sorted });
  } catch (error) {
    return handleApiError(error);
  }
}
