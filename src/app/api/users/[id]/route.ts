import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireManager, handleApiError } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { userAwards: { include: { award: true }, orderBy: { earnedAt: "desc" } }, streaks: true },
    });
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const [totalPoints, taskStats, completedWithDates] = await Promise.all([
      prisma.pointsLedger.aggregate({ where: { userId: id }, _sum: { points: true } }),
      prisma.task.groupBy({ by: ["status"], where: { assignedToId: id, archivedAt: null }, _count: true }),
      prisma.task.findMany({ where: { assignedToId: id, status: "done", completedAt: { not: null } }, select: { createdAt: true, completedAt: true, dueDate: true } }),
    ]);

    const tasksWithDueDates = completedWithDates.filter(t => t.dueDate);
    const onTimeTasks = tasksWithDueDates.filter(t => t.completedAt! <= t.dueDate!);
    const onTimeRate = tasksWithDueDates.length > 0 ? onTimeTasks.length / tasksWithDueDates.length : null;

    const completionTimes = completedWithDates.map(t => (t.completedAt!.getTime() - t.createdAt.getTime()) / 86400000);
    const avgCompletionDays = completionTimes.length > 0 ? completionTimes.reduce((s, d) => s + d, 0) / completionTimes.length : null;

    return NextResponse.json({ ...user, totalPoints: totalPoints._sum.points || 0, taskStats, onTimeRate, avgCompletionDays, totalCompleted: completedWithDates.length });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;
    const body = await request.json();
    // Whitelist allowed fields to prevent mass-assignment
    const { name, role, avatarColor, soundEnabled, isActive } = body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (avatarColor !== undefined) data.avatarColor = avatarColor;
    if (soundEnabled !== undefined) data.soundEnabled = soundEnabled;
    if (isActive !== undefined) data.isActive = isActive;
    return NextResponse.json(await prisma.user.update({ where: { id }, data }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;

    // Move all open (non-done) assigned tasks back to backlog
    const openTasks = await prisma.task.findMany({
      where: { assignedToId: id, status: { not: "done" }, archivedAt: null },
      select: { id: true },
    });

    if (openTasks.length > 0) {
      // Find the max backlog position to append after
      const maxPos = await prisma.task.aggregate({
        where: { assignedToId: null, archivedAt: null },
        _max: { backlogPosition: true },
      });
      let nextPos = (maxPos._max.backlogPosition ?? 0) + 1;

      for (const task of openTasks) {
        await prisma.task.update({
          where: { id: task.id },
          data: { assignedToId: null, backlogPosition: nextPos++ },
        });
      }
    }

    // Delete related records then the user
    await prisma.$transaction([
      prisma.pointsLedger.deleteMany({ where: { userId: id } }),
      prisma.userAward.deleteMany({ where: { userId: id } }),
      prisma.streak.deleteMany({ where: { userId: id } }),
      prisma.notification.deleteMany({ where: { userId: id } }),
      prisma.taskActivity.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true, tasksMovedToBacklog: openTasks.length });
  } catch (error) {
    return handleApiError(error);
  }
}
