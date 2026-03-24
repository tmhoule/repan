import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { calculateBacklogForecast, getWeeklyThroughput, getBacklogHealth } from "@/lib/forecasting";

export async function GET() {
  await requireSession();

  const [backlogTasks, completedTasks] = await Promise.all([
    prisma.task.findMany({
      where: { assignedToId: null, archivedAt: null },
      include: { createdBy: { select: { id: true, name: true, avatarColor: true } } },
      orderBy: { backlogPosition: "asc" },
    }),
    prisma.task.findMany({
      where: { status: "done", completedAt: { gte: new Date(Date.now() - 28 * 86400000) } },
      select: { effortEstimate: true, completedAt: true },
    }),
  ]);

  const now = new Date();
  const weeklyThroughput = getWeeklyThroughput(
    completedTasks.map((t) => ({ effortEstimate: t.effortEstimate, completedAt: t.completedAt! })), now
  );

  const forecasts = calculateBacklogForecast(
    backlogTasks.map((t) => ({ id: t.id, effortEstimate: t.effortEstimate, backlogPosition: t.backlogPosition! })), weeklyThroughput
  );

  const health = getBacklogHealth(
    backlogTasks.map((t) => ({ id: t.id, effortEstimate: t.effortEstimate, backlogPosition: t.backlogPosition! })), weeklyThroughput
  );

  const tasksWithForecasts = backlogTasks.map((task) => ({
    ...task, forecast: forecasts.find((f) => f.id === task.id),
  }));

  return NextResponse.json({ tasks: tasksWithForecasts, health, weeklyThroughput });
}
