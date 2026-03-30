import { NextResponse } from "next/server";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { getTeamRole } from "@/lib/team-auth";
import { prisma } from "@/lib/db";
import { getWeeklyThroughput, getBacklogHealth } from "@/lib/forecasting";

export async function GET() {
  try {
  const user = await requireSession();
  const teamId = await requireTeam();

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

  const workload = teamUsers.map((u) => ({
    user: u, taskCount: tasks.filter((t) => t.assignedTo?.id === u.id).length,
    byPriority: { high: tasks.filter(t => t.assignedTo?.id === u.id && t.priority === "high").length, medium: tasks.filter(t => t.assignedTo?.id === u.id && t.priority === "medium").length, low: tasks.filter(t => t.assignedTo?.id === u.id && t.priority === "low").length },
  }));

  const atRisk = tasks.filter((t) => t.status === "blocked" || t.status === "stalled" || (t.dueDate && t.dueDate < now));

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

  return NextResponse.json({ workload, atRisk, backlogHealth: health, weeklyThroughput: weeklyData, recentActivity });
  } catch (error) {
    return handleApiError(error);
  }
}
