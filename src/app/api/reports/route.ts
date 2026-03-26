import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { getTeamRole } from "@/lib/team-auth";

export async function GET(request: NextRequest) {
  try {
  const user = await requireSession();
  const teamId = await requireTeam();
  const period = request.nextUrl.searchParams.get("period") || "weekly";
  const daysBack = period === "monthly" ? 30 : 7;
  const since = new Date(Date.now() - daysBack * 86400000);

  // Fetch tasks completed over the last 8 weeks for throughput chart
  const eightWeeksAgo = new Date(Date.now() - 56 * 86400000);
  const now = new Date();

  const [completed, created, backlogCount, completedForThroughput] = await Promise.all([
    prisma.task.findMany({ where: { status: "done", completedAt: { gte: since }, teamId }, include: { assignedTo: { select: { id: true, name: true } } } }),
    prisma.task.count({ where: { createdAt: { gte: since }, teamId } }),
    prisma.task.count({ where: { assignedToId: null, archivedAt: null, teamId } }),
    prisma.task.findMany({ where: { status: "done", completedAt: { gte: eightWeeksAgo }, teamId }, select: { effortEstimate: true, completedAt: true } }),
  ]);

  const missedDeadlines = completed.filter(t => t.dueDate && t.completedAt && t.completedAt > t.dueDate).length;
  const previousBacklogCount = await prisma.task.count({ where: { assignedToId: null, archivedAt: null, teamId, createdAt: { lte: since } } });

  // Boulder utilization
  const boulders = await prisma.task.findMany({
    where: { status: "boulder", archivedAt: null, teamId, assignedToId: { not: null } },
    select: { assignedToId: true, timeAllocation: true },
  });
  const totalBoulderAllocation = boulders.reduce((sum, b) => sum + (b.timeAllocation ?? 0), 0);
  const activeBoulderCount = boulders.length;

  const summary = { tasksCompleted: completed.length, tasksCreated: created, backlogSize: backlogCount, backlogDelta: backlogCount - previousBacklogCount, missedDeadlines, activeBoulderCount, totalBoulderAllocation, period };

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

  // Per-person breakdown: visible to team managers and super_admins
  const teamRole = await getTeamRole(user.id, teamId);
  const canViewFull = user.isSuperAdmin || teamRole === "manager";

  let perPerson = null;
  if (canViewFull) {
    const teamMemberships = await prisma.teamMembership.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true, isActive: true } } },
    });
    const teamUsers = teamMemberships.map((m) => m.user).filter((u) => u.isActive);

    perPerson = await Promise.all(teamUsers.map(async (u) => {
      const [tasksDone, points] = await Promise.all([
        prisma.task.count({ where: { assignedToId: u.id, status: "done", completedAt: { gte: since }, teamId } }),
        prisma.pointsLedger.aggregate({ where: { userId: u.id, timestamp: { gte: since } }, _sum: { points: true } }),
      ]);
      const userBoulders = boulders.filter((b) => b.assignedToId === u.id);
      const boulderAllocation = userBoulders.reduce((sum, b) => sum + (b.timeAllocation ?? 0), 0);
      return { user: u, tasksCompleted: tasksDone, pointsEarned: points._sum.points || 0, boulderAllocation };
    }));
  }

  return NextResponse.json({ summary, perPerson, weeklyThroughput });
  } catch (error) {
    return handleApiError(error);
  }
}
