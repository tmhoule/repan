import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireSession, requireManager, handleApiError } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userAwards: { include: { award: true }, orderBy: { earnedAt: "desc" } },
        streaks: true,
        teamMemberships: { include: { team: { select: { id: true, name: true } } } },
      },
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
    const currentUser = await requireManager();
    const { id } = await params;
    const body = await request.json();
    // Whitelist allowed fields to prevent mass-assignment
    const { name, role, avatarColor, soundEnabled, isActive, isSuperAdmin, password } = body;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (avatarColor !== undefined) data.avatarColor = avatarColor;
    if (soundEnabled !== undefined) data.soundEnabled = soundEnabled;
    if (isActive !== undefined) data.isActive = isActive;
    // Only super admins can grant/revoke super admin status
    if (isSuperAdmin !== undefined && currentUser.isSuperAdmin) data.isSuperAdmin = isSuperAdmin;
    // Set or clear password (skip for SSO users)
    if (password !== undefined) {
      const target = await prisma.user.findUnique({ where: { id }, select: { ssoUser: true } });
      if (!target?.ssoUser) {
        data.passwordHash = password ? await bcrypt.hash(password, 10) : null;
      }
    }
    return NextResponse.json(await prisma.user.update({ where: { id }, data }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireManager();
    const { id } = await params;

    // Wrap everything in an interactive transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Move all open (non-done) assigned tasks back to backlog
      const openTasks = await tx.task.findMany({
        where: { assignedToId: id, status: { not: "done" }, archivedAt: null },
        select: { id: true, teamId: true },
      });

      if (openTasks.length > 0) {
        const teamIds = [...new Set(openTasks.map((t) => t.teamId))];
        const teamMaxPositions: Record<string, number> = {};

        for (const tid of teamIds) {
          const maxPos = await tx.task.aggregate({
            where: { assignedToId: null, archivedAt: null, teamId: tid },
            _max: { backlogPosition: true },
          });
          teamMaxPositions[tid] = (maxPos._max.backlogPosition ?? 0) + 1;
        }

        for (const task of openTasks) {
          const nextPos = teamMaxPositions[task.teamId]++;
          await tx.task.update({
            where: { id: task.id },
            data: { assignedToId: null, backlogPosition: nextPos },
          });
        }
      }

      // Delete related records then the user
      await tx.pointsLedger.deleteMany({ where: { userId: id } });
      await tx.userAward.deleteMany({ where: { userId: id } });
      await tx.streak.deleteMany({ where: { userId: id } });
      await tx.notification.deleteMany({ where: { userId: id } });
      await tx.taskActivity.deleteMany({ where: { userId: id } });
      await tx.teamMembership.deleteMany({ where: { userId: id } });
      await tx.todo.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });

      return openTasks.length;
    });

    return NextResponse.json({ success: true, tasksMovedToBacklog: result });
  } catch (error) {
    return handleApiError(error);
  }
}
