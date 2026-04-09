import { NextResponse } from "next/server";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { getTeamRole } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { getWeeklyThroughput, getBacklogHealth } from "@/lib/forecasting";
import { getLastActivityMap, getRiskFlags, getTeamCycleTimes } from "@/lib/risk-detection";
import { computeUserSnapshot } from "@/lib/workload-snapshot";

export async function GET() {
  try {
  const user = await requireSession();
  const teamId = await requireTeam();

  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    select: { weightHigh: true, weightMedium: true, weightLow: true, multiplierBlocked: true, multiplierStalled: true },
  });

  // Check team manager or super_admin access
  const teamRole = await getTeamRole(user.id, teamId);
  if (!user.isSuperAdmin && teamRole !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
  const now = new Date();

  // Get users who are members of this team
  const teamMemberships = await prisma.teamMembership.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true, avatarColor: true, isActive: true } } },
  });
  const teamUsers = teamMemberships.map((m) => m.user).filter((u) => u.isActive);

  const [tasks, backlogTasks, recentActivity, completedRecent, previousBacklogSize] = await Promise.all([
    prisma.task.findMany({ where: { archivedAt: null, status: { not: "done" }, teamId }, include: { assignedTo: { select: { id: true, name: true } } } }),
    prisma.task.findMany({ where: { assignedToId: null, archivedAt: null, teamId }, select: { id: true, effortEstimate: true, backlogPosition: true } }),
    prisma.taskActivity.findMany({
      where: { task: { teamId } },
      orderBy: { timestamp: "desc" },
      take: 50,
      include: { user: { select: { name: true, avatarColor: true } }, task: { select: { id: true, title: true } } },
    }),
    prisma.task.findMany({ where: { status: "done", completedAt: { gte: new Date(Date.now() - 56 * 86400000) }, teamId }, select: { effortEstimate: true, completedAt: true } }),
    prisma.task.count({ where: { assignedToId: null, archivedAt: null, teamId, createdAt: { lte: oneWeekAgo } } }),
  ]);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

  const workload = await Promise.all(teamUsers.map(async (u) => {
    const userTasks = tasks.filter((t) => t.assignedTo?.id === u.id && t.status !== "boulder");

    const currentBoulder = tasks.filter(t => t.assignedTo?.id === u.id && t.status === "boulder").reduce((sum, t) => sum + (t.timeAllocation ?? 0), 0);

    // Use snapshots for 30-day average, with fallback for fresh deploys
    const snapshotCount = await prisma.workloadSnapshot.count({
      where: { userId: u.id, teamId, date: { gte: thirtyDaysAgo } },
    });

    let avg30d: number;
    if (snapshotCount >= 7) {
      const agg = await prisma.workloadSnapshot.aggregate({
        where: { userId: u.id, teamId, date: { gte: thirtyDaysAgo } },
        _avg: { workloadScore: true },
      });
      avg30d = Math.round(agg._avg.workloadScore ?? 0);
    } else {
      // Fallback: compute from current task state (same as before, less accurate)
      const allUserTasks = tasks.filter((t) => t.assignedTo?.id === u.id);
      const snapshot = computeUserSnapshot(
        allUserTasks.map((t) => ({ status: t.status, priority: t.priority, timeAllocation: t.timeAllocation ?? 0 })),
        team
      );
      avg30d = snapshot.workloadScore;
    }

    const wipCount = userTasks.filter(t => t.status === "in_progress").length;

    return {
      user: u, taskCount: userTasks.length, wipCount,
      byPriority: { high: userTasks.filter(t => t.priority === "high").length, medium: userTasks.filter(t => t.priority === "medium").length, low: userTasks.filter(t => t.priority === "low").length },
      tasks: userTasks.map(t => ({ title: t.title, priority: t.priority })),
      boulders: tasks.filter(t => t.assignedTo?.id === u.id && t.status === "boulder").map(t => ({ title: t.title, timeAllocation: t.timeAllocation ?? 0 })),
      boulderAllocation: currentBoulder,
      avg30d,
    };
  }));

  // Build at-risk list with risk detection
  const allTaskIds = tasks.map((t) => t.id);
  const lastActivityMap = await getLastActivityMap(allTaskIds);
  const cycleTimes = await getTeamCycleTimes(teamId);

  const atRisk = tasks
    .map((t) => {
      const flags = getRiskFlags(t, lastActivityMap.get(t.id), now, cycleTimes);
      if (flags.length === 0) return null;
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        percentComplete: t.percentComplete,
        dueDate: t.dueDate,
        assignedTo: t.assignedTo,
        riskFlags: flags,
      };
    })
    .filter(Boolean);

  const throughput = getWeeklyThroughput(completedRecent.map((t) => ({ effortEstimate: t.effortEstimate, completedAt: t.completedAt! })), now);
  const health = getBacklogHealth(backlogTasks.map((t) => ({ id: t.id, effortEstimate: t.effortEstimate, backlogPosition: t.backlogPosition! })), throughput, previousBacklogSize);

  const weeklyData: { week: string; points: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
    const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
    const pts = completedRecent.filter(t => t.completedAt! >= weekStart && t.completedAt! < weekEnd)
      .reduce((sum, t) => sum + ({ small: 1, medium: 3, large: 5 }[t.effortEstimate] ?? 1), 0);
    weeklyData.push({ week: weekStart.toISOString().split("T")[0], points: pts });
  }

  // Key projects: high-priority tasks with their tracking status
  const keyProjects = tasks
    .filter((t) => t.priority === "high" && t.status !== "boulder")
    .map((t) => {
      const flags = getRiskFlags(t, lastActivityMap.get(t.id), now, cycleTimes);
      const riskTypes = new Set(flags.map((f) => f.riskType));

      let tracking: "on_track" | "behind" | "at_risk" | "blocked" = "on_track";
      if (riskTypes.has("blocked")) tracking = "blocked";
      else if (riskTypes.has("behind_schedule") || riskTypes.has("overdue")) tracking = "behind";
      else if (riskTypes.has("stale") || riskTypes.has("stalled")) tracking = "at_risk";

      return {
        id: t.id,
        title: t.title,
        status: t.status,
        percentComplete: t.percentComplete,
        dueDate: t.dueDate,
        assignedTo: t.assignedTo,
        tracking,
        riskFlags: flags,
      };
    });

  // Recent badge achievements across the team (last 7 days)
  const recentBadges = await prisma.userAward.findMany({
    where: {
      user: { teamMemberships: { some: { teamId } } },
      earnedAt: { gte: new Date(Date.now() - 7 * 86400000) },
    },
    include: {
      user: { select: { id: true, name: true, avatarColor: true } },
      award: { select: { name: true, icon: true, description: true } },
    },
    orderBy: { earnedAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ workload, atRisk, keyProjects, backlogHealth: health, weeklyThroughput: weeklyData, recentActivity, recentBadges, priorityWeights: { high: team.weightHigh, medium: team.weightMedium, low: team.weightLow } });
  } catch (error) {
    return handleApiError(error);
  }
}
