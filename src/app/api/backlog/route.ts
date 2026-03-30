import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { calculateBacklogForecast, getWeeklyThroughput, getBacklogHealth } from "@/lib/forecasting";
import { sortByUrgency } from "@/lib/urgency";

export async function GET(request: NextRequest) {
  try {
  await requireSession();
  const teamId = await requireTeam();
  const bucketId = request.nextUrl.searchParams.get("bucketId");

  const [backlogTasks, completedTasks] = await Promise.all([
    prisma.task.findMany({
      where: {
        assignedToId: null,
        archivedAt: null,
        teamId,
        ...(bucketId ? { bucketId } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true, avatarColor: true } },
        bucket: { select: { id: true, name: true, colorKey: true } },
      },
    }),
    prisma.task.findMany({
      where: { status: "done", completedAt: { gte: new Date(Date.now() - 28 * 86400000) }, teamId },
      select: { effortEstimate: true, completedAt: true },
    }),
  ]);

  // Sort backlog by urgency score (priority + due date + effort)
  const sortedTasks = sortByUrgency(
    backlogTasks.map((t) => ({
      ...t,
      priority: t.priority as "high" | "medium" | "low",
      dueDate: t.dueDate,
      createdAt: t.createdAt,
      effortEstimate: t.effortEstimate,
    }))
  );

  const now = new Date();
  const weeklyThroughput = getWeeklyThroughput(
    completedTasks.map((t) => ({ effortEstimate: t.effortEstimate, completedAt: t.completedAt! })), now
  );

  // Use sorted position for forecasting
  const forecasts = calculateBacklogForecast(
    sortedTasks.map((t, i) => ({ id: t.id, effortEstimate: t.effortEstimate, backlogPosition: i + 1 })), weeklyThroughput
  );

  const health = getBacklogHealth(
    sortedTasks.map((t, i) => ({ id: t.id, effortEstimate: t.effortEstimate, backlogPosition: i + 1 })), weeklyThroughput
  );

  const tasksWithForecasts = sortedTasks.map((task) => ({
    ...task, forecast: forecasts.find((f) => f.id === task.id),
  }));

  return NextResponse.json({ tasks: tasksWithForecasts, health, weeklyThroughput });
  } catch (error) {
    return handleApiError(error);
  }
}
