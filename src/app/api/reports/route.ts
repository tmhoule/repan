import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { canViewFullReports } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const user = await requireSession();
  const period = request.nextUrl.searchParams.get("period") || "weekly";
  const daysBack = period === "monthly" ? 30 : 7;
  const since = new Date(Date.now() - daysBack * 86400000);

  const [completed, created, backlogCount] = await Promise.all([
    prisma.task.findMany({ where: { status: "done", completedAt: { gte: since } }, include: { assignedTo: { select: { id: true, name: true } } } }),
    prisma.task.count({ where: { createdAt: { gte: since } } }),
    prisma.task.count({ where: { assignedToId: null, archivedAt: null } }),
  ]);

  const missedDeadlines = completed.filter(t => t.dueDate && t.completedAt && t.completedAt > t.dueDate).length;
  const previousBacklogCount = await prisma.task.count({ where: { assignedToId: null, archivedAt: null, createdAt: { lte: since } } });

  const summary = { tasksCompleted: completed.length, tasksCreated: created, backlogSize: backlogCount, backlogDelta: backlogCount - previousBacklogCount, missedDeadlines, period };

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

  return NextResponse.json({ summary, perPerson });
}
