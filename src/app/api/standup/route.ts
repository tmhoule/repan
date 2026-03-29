import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";

export async function GET() {
  try {
    await requireSession();
    const teamId = await requireTeam();

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    // Get team members
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true, avatarColor: true, isActive: true } } },
    });
    const users = memberships.map((m) => m.user).filter((u) => u.isActive);

    // Get completed yesterday, active today, and blocked for all team members
    const [completedYesterday, activeTasks] = await Promise.all([
      prisma.task.findMany({
        where: {
          teamId,
          status: "done",
          completedAt: { gte: yesterdayStart, lt: todayStart },
          assignedToId: { in: users.map((u) => u.id) },
        },
        select: { id: true, title: true, assignedToId: true, priority: true },
      }),
      prisma.task.findMany({
        where: {
          teamId,
          archivedAt: null,
          status: { notIn: ["done", "boulder"] },
          assignedToId: { in: users.map((u) => u.id) },
        },
        select: { id: true, title: true, assignedToId: true, status: true, priority: true, blockerReason: true },
      }),
    ]);

    const standup = users.map((u) => {
      const yesterday = completedYesterday.filter((t) => t.assignedToId === u.id);
      const today = activeTasks.filter((t) => t.assignedToId === u.id && t.status !== "blocked");
      const blocked = activeTasks.filter((t) => t.assignedToId === u.id && t.status === "blocked");
      return {
        user: u,
        yesterday: yesterday.map((t) => ({ id: t.id, title: t.title, priority: t.priority })),
        today: today.map((t) => ({ id: t.id, title: t.title, priority: t.priority, status: t.status })),
        blocked: blocked.map((t) => ({ id: t.id, title: t.title, priority: t.priority, blockerReason: t.blockerReason })),
      };
    });

    return NextResponse.json({ standup, date: now.toISOString() });
  } catch (error) {
    return handleApiError(error);
  }
}
