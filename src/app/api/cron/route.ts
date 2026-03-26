import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { getLastActivityMap, isStale, isBehindSchedule } from "@/lib/risk-detection";

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

  // 4. Notify team managers about unassigned backlog tasks due within 7 days
  const oneWeekFromNow = new Date(now);
  oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

  const backlogTasksDueSoon = await prisma.task.findMany({
    where: { assignedToId: null, archivedAt: null, status: { not: "done" }, dueDate: { gte: now, lte: oneWeekFromNow } },
    include: { team: { include: { memberships: { where: { role: "manager" }, select: { userId: true } } } } },
  });

  let backlogAlerts = 0;
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  for (const task of backlogTasksDueSoon) {
    const daysUntilDue = Math.ceil((task.dueDate!.getTime() - now.getTime()) / 86400000);
    const managerIds = task.team.memberships.map((m) => m.userId);
    for (const managerId of managerIds) {
      const existing = await prisma.notification.findFirst({
        where: { userId: managerId, taskId: task.id, type: "due_date_approaching", createdAt: { gte: todayStart } },
      });
      if (!existing) {
        await createNotification(managerId, "due_date_approaching", "Backlog task due soon",
          `"${task.title}" is unassigned and due in ${daysUntilDue} day${daysUntilDue !== 1 ? "s" : ""}`, task.id);
        backlogAlerts++;
      }
    }
  }
  results.backlogDueDateAlerts = backlogAlerts;

  // 5. Weekly risk digest for team managers (runs daily, sends once per week on Mondays)
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
  if (dayOfWeek === 1) {
    const teams = await prisma.team.findMany({
      include: { memberships: { where: { role: "manager" }, select: { userId: true } } },
    });

    let digestsSent = 0;
    for (const team of teams) {
      const activeTasks = await prisma.task.findMany({
        where: { teamId: team.id, archivedAt: null, status: { notIn: ["done", "boulder"] }, assignedToId: { not: null } },
      });

      if (activeTasks.length === 0) continue;

      const taskIds = activeTasks.map((t) => t.id);
      const activityMap = await getLastActivityMap(taskIds);

      let staleCount = 0;
      let behindCount = 0;
      let blockedCount = 0;
      for (const task of activeTasks) {
        if (task.status === "blocked") blockedCount++;
        else if (isStale(task, activityMap.get(task.id), now)) staleCount++;
        if (isBehindSchedule(task, now)) behindCount++;
      }

      const totalIssues = staleCount + behindCount + blockedCount;
      if (totalIssues === 0) continue;

      const parts: string[] = [];
      if (staleCount > 0) parts.push(`${staleCount} stale`);
      if (behindCount > 0) parts.push(`${behindCount} behind schedule`);
      if (blockedCount > 0) parts.push(`${blockedCount} blocked`);
      const message = `${team.name}: ${totalIssues} task${totalIssues !== 1 ? "s" : ""} need attention — ${parts.join(", ")}`;

      const managerIds = team.memberships.map((m) => m.userId);
      for (const managerId of managerIds) {
        // Check we haven't already sent a digest this week
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const existing = await prisma.notification.findFirst({
          where: { userId: managerId, type: "due_date_approaching", title: "Weekly risk digest", createdAt: { gte: weekStart } },
        });
        if (!existing) {
          await createNotification(managerId, "due_date_approaching", "Weekly risk digest", message);
          digestsSent++;
        }
      }
    }
    results.weeklyDigestsSent = digestsSent;
  }

  return NextResponse.json({ success: true, results });
}
