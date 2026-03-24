import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: Record<string, number> = {};

  // 1. Archive completed tasks older than 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const archived = await prisma.task.updateMany({
    where: { status: "done", completedAt: { lte: ninetyDaysAgo }, archivedAt: null },
    data: { archivedAt: now },
  });
  results.tasksArchived = archived.count;

  // 2. Purge notifications older than 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const purged = await prisma.notification.deleteMany({
    where: { createdAt: { lte: thirtyDaysAgo } },
  });
  results.notificationsPurged = purged.count;

  // 3. Generate due-date-approaching notifications
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const tasksDueTomorrow = await prisma.task.findMany({
    where: { dueDate: { gte: tomorrowStart, lte: tomorrowEnd }, status: { notIn: ["done"] }, assignedToId: { not: null }, archivedAt: null },
  });

  let dueDateNotifications = 0;
  for (const task of tasksDueTomorrow) {
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const existing = await prisma.notification.findFirst({
      where: { userId: task.assignedToId!, taskId: task.id, type: "due_date_approaching", createdAt: { gte: todayStart } },
    });
    if (!existing) {
      await createNotification(task.assignedToId!, "due_date_approaching", "Task due tomorrow", `"${task.title}" is due tomorrow`, task.id);
      dueDateNotifications++;
    }
  }
  results.dueDateNotifications = dueDateNotifications;

  return NextResponse.json({ success: true, results });
}
