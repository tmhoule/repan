import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";

export async function GET() {
  try {
    await requireSession();
    const teamId = await requireTeam();

    const team = await prisma.team.findUniqueOrThrow({
      where: { id: teamId },
      select: { weightHigh: true, weightMedium: true, weightLow: true, multiplierBlocked: true, multiplierStalled: true },
    });

    const now = new Date();
    const twoWeeksOut = new Date(now.getTime() + 14 * 86400000);

    const memberships = await prisma.teamMembership.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true, avatarColor: true, isActive: true } } },
    });
    const users = memberships.map((m) => m.user).filter((u) => u.isActive);

    // Get all active tasks with due dates in the next 2 weeks
    const tasks = await prisma.task.findMany({
      where: {
        teamId,
        archivedAt: null,
        status: { notIn: ["done", "boulder"] },
        assignedToId: { in: users.map((u) => u.id) },
        dueDate: { not: null, lte: twoWeeksOut },
      },
      select: {
        id: true,
        title: true,
        priority: true,
        effortEstimate: true,
        dueDate: true,
        status: true,
        assignedToId: true,
        percentComplete: true,
      },
    });

    // Also get tasks with no due date (ongoing load)
    const noDueDateTasks = await prisma.task.findMany({
      where: {
        teamId,
        archivedAt: null,
        status: { notIn: ["done", "boulder"] },
        assignedToId: { in: users.map((u) => u.id) },
        dueDate: null,
      },
      select: {
        id: true,
        title: true,
        priority: true,
        effortEstimate: true,
        status: true,
        assignedToId: true,
        percentComplete: true,
      },
    });

    // Get boulder allocations
    const boulders = await prisma.task.findMany({
      where: { teamId, archivedAt: null, status: "boulder", assignedToId: { in: users.map((u) => u.id) } },
      select: { assignedToId: true, timeAllocation: true },
    });

    const thisWeekEnd = new Date(now.getTime() + 7 * 86400000);

    const capacity = users.map((u) => {
      const userTasks = tasks.filter((t) => t.assignedToId === u.id);
      const userNoDue = noDueDateTasks.filter((t) => t.assignedToId === u.id);
      const userBoulders = boulders.filter((b) => b.assignedToId === u.id);
      const boulderPct = userBoulders.reduce((sum, b) => sum + (b.timeAllocation ?? 0), 0);

      const thisWeek = userTasks.filter((t) => t.dueDate! <= thisWeekEnd);
      const nextWeek = userTasks.filter((t) => t.dueDate! > thisWeekEnd);

      const calcLoad = (tasks: typeof userTasks) => {
        return tasks.reduce((sum, t) => {
          let weight = t.priority === "high" ? team.weightHigh : t.priority === "medium" ? team.weightMedium : team.weightLow;
          if (t.status === "blocked") weight = Math.round(weight * team.multiplierBlocked / 100);
          else if (t.status === "stalled") weight = Math.round(weight * team.multiplierStalled / 100);
          const remaining = 1 - (t.percentComplete ?? 0) / 100;
          return sum + Math.round(weight * remaining);
        }, 0);
      };

      return {
        user: u,
        boulderPct,
        thisWeek: {
          tasks: thisWeek.map((t) => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate, percentComplete: t.percentComplete })),
          load: calcLoad(thisWeek) + boulderPct,
        },
        nextWeek: {
          tasks: nextWeek.map((t) => ({ id: t.id, title: t.title, priority: t.priority, dueDate: t.dueDate, percentComplete: t.percentComplete })),
          load: calcLoad(nextWeek) + boulderPct,
        },
        noDueDate: userNoDue.length,
      };
    });

    return NextResponse.json({ capacity });
  } catch (error) {
    return handleApiError(error);
  }
}
