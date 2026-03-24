import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError } from "@/lib/session";
import { canViewFullReports } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  try {
  const user = await requireSession();
  const period = request.nextUrl.searchParams.get("period") || "weekly";
  const daysBack = period === "monthly" ? 30 : 7;
  const since = new Date(Date.now() - daysBack * 86400000);

  // Fetch tasks completed over the last 8 weeks for throughput chart
  const eightWeeksAgo = new Date(Date.now() - 56 * 86400000);
  const now = new Date();

  const [completed, created, backlogCount, completedForThroughput] = await Promise.all([
    prisma.task.findMany({ where: { status: "done", completedAt: { gte: since } }, include: { assignedTo: { select: { id: true, name: true } } } }),
    prisma.task.count({ where: { createdAt: { gte: since } } }),
    prisma.task.count({ where: { assignedToId: null, archivedAt: null } }),
    prisma.task.findMany({ where: { status: "done", completedAt: { gte: eightWeeksAgo } }, select: { effortEstimate: true, completedAt: true } }),
  ]);

  const missedDeadlines = completed.filter(t => t.dueDate && t.completedAt && t.completedAt > t.dueDate).length;
  const previousBacklogCount = await prisma.task.count({ where: { assignedToId: null, archivedAt: null, createdAt: { lte: since } } });

  const summary = { tasksCompleted: completed.length, tasksCreated: created, backlogSize: backlogCount, backlogDelta: backlogCount - previousBacklogCount, missedDeadlines, period };

  // Build weekly throughput series (last 8 weeks)
  const weeklyThroughput: { week: string; points: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
    const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
    const pts = completedForThroughput
      .filter(t => t.completedAt! >= weekStart && t.completedAt! < weekEnd)
      .reduce((sum, t) => sum + ({ small: 1, medium: 3, large: 5 }[t.effortEstimate] ?? 1), 0);
    weeklyThroughput.push({ week: weekStart.toISOString().split("T")[0], points: pts });
  }

  let perPerson = null;
  if (canViewFullReports({ id: user.id, role: user.role })) {
    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } });
    perPerson = await Promise.all(users.map(async (u) => {
      const [tasksDone, points] = await Promise.all([
        prisma.task.count({ where: { assignedToId: u.id, status: "done", completedAt: { gte: since } } }),
        prisma.pointsLedger.aggregate({ where: { userId: u.id, timestamp: { gte: since } }, _sum: { points: true } }),
      ]);
      return { user: u, tasksCompleted: tasksDone, pointsEarned: points._sum.points || 0 };
    }));
  }

  return NextResponse.json({ summary, perPerson, weeklyThroughput });
  } catch (error) {
    return handleApiError(error);
  }
}
