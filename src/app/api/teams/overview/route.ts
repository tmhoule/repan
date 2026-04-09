import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireSession();

    // Find all teams where user is a manager (or super admin sees all)
    const teamIds: string[] = [];
    if (user.isSuperAdmin) {
      const teams = await prisma.team.findMany({ select: { id: true } });
      teamIds.push(...teams.map((t) => t.id));
    } else {
      const memberships = await prisma.teamMembership.findMany({
        where: { userId: user.id, role: { in: ["manager", "supervisor"] } },
        select: { teamId: true },
      });
      teamIds.push(...memberships.map((m) => m.teamId));
    }

    if (teamIds.length === 0) {
      return NextResponse.json({ teams: [] });
    }

    const now = new Date();
    const eightWeeksAgo = new Date(now.getTime() - 56 * 86400000);

    const teams = await Promise.all(teamIds.map(async (teamId) => {
      const team = await prisma.team.findUniqueOrThrow({
        where: { id: teamId },
        select: { id: true, name: true },
      });

      const memberCount = await prisma.teamMembership.count({
        where: { teamId, role: { not: "supervisor" }, user: { isActive: true } },
      });

      const [tasks, completedRecent] = await Promise.all([
        prisma.task.findMany({
          where: { teamId, archivedAt: null, status: { not: "done" } },
          select: { status: true, priority: true, assignedToId: true, dueDate: true, percentComplete: true, createdAt: true },
        }),
        prisma.task.findMany({
          where: { teamId, status: "done", completedAt: { gte: eightWeeksAgo } },
          select: { effortEstimate: true, completedAt: true },
        }),
      ]);

      const activeTasks = tasks.filter((t) => t.status !== "boulder");
      const wipCount = activeTasks.filter((t) => t.status === "in_progress").length;
      const blockedCount = activeTasks.filter((t) => t.status === "blocked" || t.status === "stalled" || t.status === "paused").length;
      const overdueCount = activeTasks.filter((t) => t.dueDate && t.dueDate < now && t.assignedToId).length;
      const atRiskCount = blockedCount + overdueCount;
      const backlogCount = tasks.filter((t) => !t.assignedToId && t.status !== "boulder").length;

      // Weekly throughput (last 8 weeks)
      const weeklyPoints: number[] = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
        const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
        const pts = completedRecent
          .filter((t) => t.completedAt! >= weekStart && t.completedAt! < weekEnd)
          .reduce((sum, t) => sum + ({ small: 1, medium: 3, large: 5 }[t.effortEstimate] ?? 1), 0);
        weeklyPoints.push(pts);
      }
      const avgThroughput = weeklyPoints.length > 0
        ? Math.round(weeklyPoints.reduce((s, p) => s + p, 0) / weeklyPoints.length)
        : 0;

      // Health score: green/yellow/red
      let health: "green" | "yellow" | "red" = "green";
      if (atRiskCount > memberCount || blockedCount > Math.ceil(memberCount / 2)) {
        health = "red";
      } else if (atRiskCount > 0 || backlogCount > memberCount * 5) {
        health = "yellow";
      }

      return {
        id: team.id,
        name: team.name,
        memberCount,
        wipCount,
        atRiskCount,
        blockedCount,
        backlogCount,
        avgThroughput,
        weeklyPoints,
        health,
      };
    }));

    return NextResponse.json({ teams });
  } catch (error) {
    return handleApiError(error);
  }
}
