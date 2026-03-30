import { NextResponse } from "next/server";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { getTeamRole } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { getWeeklyThroughput, getBacklogHealth } from "@/lib/forecasting";
import { getLastActivityMap, getRiskFlags } from "@/lib/risk-detection";

export async function GET() {
  try {
  const user = await requireSession();
  const teamId = await requireTeam();

  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    select: { weightHigh: true, weightMedium: true, weightLow: true },
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

  // 30-day historical tasks for rolling average (completed + currently active)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const historicalTasks = await prisma.task.findMany({
    where: {
      teamId,
      archivedAt: null,
      OR: [
        { status: { not: "done" } },
        { status: "done", completedAt: { gte: thirtyDaysAgo } },
      ],
    },
    select: { assignedToId: true, priority: true, status: true, timeAllocation: true, createdAt: true, completedAt: true },
  });

  const workload = teamUsers.map((u) => {
    const userTasks = tasks.filter((t) => t.assignedTo?.id === u.id && t.status !== "boulder");

    // Calculate current workload %
    const currentHigh = userTasks.filter(t => t.priority === "high").length * team.weightHigh;
    const currentMed = userTasks.filter(t => t.priority === "medium").length * team.weightMedium;
    const currentLow = userTasks.filter(t => t.priority === "low").length * team.weightLow;
    const currentBoulder = tasks.filter(t => t.assignedTo?.id === u.id && t.status === "boulder").reduce((sum, t) => sum + (t.timeAllocation ?? 0), 0);
    const currentTotal = currentHigh + currentMed + currentLow + currentBoulder;

    // 30-day rolling average: sample workload at each day over the last 30 days
    // For each day, count tasks that were active on that day (created before, not completed before)
    let totalDailyLoad = 0;
    const userHistorical = historicalTasks.filter((t) => t.assignedToId === u.id);
    for (let d = 0; d < 30; d++) {
      const day = new Date(Date.now() - d * 86400000);
      let dayLoad = 0;
      for (const t of userHistorical) {
        if (t.createdAt > day) continue;
        if (t.status === "done" && t.completedAt && t.completedAt < day) continue;
        if (t.status === "boulder") {
          dayLoad += t.timeAllocation ?? 0;
        } else {
          dayLoad += t.priority === "high" ? team.weightHigh : t.priority === "medium" ? team.weightMedium : team.weightLow;
        }
      }
      totalDailyLoad += dayLoad;
    }
    const avg30d = Math.round(totalDailyLoad / 30);

    return {
      user: u, taskCount: userTasks.length,
      byPriority: { high: userTasks.filter(t => t.priority === "high").length, medium: userTasks.filter(t => t.priority === "medium").length, low: userTasks.filter(t => t.priority === "low").length },
      tasks: userTasks.map(t => ({ title: t.title, priority: t.priority })),
      boulders: tasks.filter(t => t.assignedTo?.id === u.id && t.status === "boulder").map(t => ({ title: t.title, timeAllocation: t.timeAllocation ?? 0 })),
      boulderAllocation: currentBoulder,
      avg30d,
    };
  });

  // Build at-risk list with risk detection
  const allTaskIds = tasks.map((t) => t.id);
  const lastActivityMap = await getLastActivityMap(allTaskIds);

  // Also fetch unassigned backlog tasks with due dates for risk detection
  const oneWeekFromNow = new Date(now.getTime() + 7 * 86400000);
  const backlogAtRisk = await prisma.task.findMany({
    where: { assignedToId: null, archivedAt: null, teamId, status: { not: "done" }, dueDate: { lte: oneWeekFromNow } },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  const backlogIds = backlogAtRisk.map((t) => t.id);
  const backlogActivityMap = await getLastActivityMap(backlogIds);

  const allCandidates = [...tasks, ...backlogAtRisk];
  const combinedActivityMap = new Map([...lastActivityMap, ...backlogActivityMap]);

  const atRisk = allCandidates
    .map((t) => {
      const flags = getRiskFlags(t, combinedActivityMap.get(t.id), now);
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
      const flags = getRiskFlags(t, lastActivityMap.get(t.id), now);
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
