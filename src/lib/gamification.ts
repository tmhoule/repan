import { prisma } from "./db";
import { calculatePoints, PointAction } from "./points";
import { shouldIncrementStreak, shouldResetStreak, isStreakMilestone } from "./streaks";
import { evaluateCriteria, BadgeCriteria, UserStats } from "./badges";
import { createNotification } from "./notifications";

export async function awardAction(userId: string, action: PointAction, taskId?: string) {
  const points = calculatePoints(action);

  // Anti-gaming: progress updates max 2pts per task per day
  if (action.action === "progress_update" && taskId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await prisma.pointsLedger.count({
      where: { userId, taskId, actionType: "progress_update", timestamp: { gte: today } },
    });
    if (existing >= 1) return; // Already got points for this task today
  }

  // Anti-gaming: comments max 5pts per day
  if (action.action === "comment") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCommentPoints = await prisma.pointsLedger.aggregate({
      where: { userId, actionType: "comment", timestamp: { gte: today } },
      _sum: { points: true },
    });
    if ((todayCommentPoints._sum.points || 0) >= 5) return;
  }

  // Award points
  if (points > 0) {
    await prisma.pointsLedger.create({
      data: { userId, taskId, actionType: action.action, points },
    });
  }

  // Update streaks
  await updateStreaksForAction(userId, action.action);

  // Evaluate badges
  await evaluateNewBadges(userId);
}

// Called when a task with a due date is completed
export async function updateOnTimeStreak(userId: string, completedOnTime: boolean) {
  const streak = await prisma.streak.findUnique({
    where: { userId_streakType: { userId, streakType: "on_time_completion" } },
  });

  if (completedOnTime) {
    if (streak) {
      const newCount = streak.currentCount + 1;
      await prisma.streak.update({
        where: { id: streak.id },
        data: {
          currentCount: newCount,
          longestCount: Math.max(newCount, streak.longestCount),
          lastActivity: new Date(),
        },
      });
      if (isStreakMilestone(newCount)) {
        await awardAction(userId, { action: "streak_milestone", streakCount: newCount });
      }
    } else {
      await prisma.streak.create({
        data: { userId, streakType: "on_time_completion", currentCount: 1, longestCount: 1, lastActivity: new Date() },
      });
    }
  } else {
    if (streak && streak.currentCount > 0) {
      await prisma.streak.update({
        where: { id: streak.id },
        data: { currentCount: 0, lastActivity: new Date() },
      });
    }
  }
}

async function updateStreaksForAction(userId: string, actionType: string) {
  const now = new Date();

  // Daily check-in streak
  const dailyStreak = await prisma.streak.findUnique({
    where: { userId_streakType: { userId, streakType: "daily_checkin" } },
  });

  if (dailyStreak) {
    if (shouldResetStreak("daily_checkin", dailyStreak.lastActivity, now)) {
      await prisma.streak.update({
        where: { id: dailyStreak.id },
        data: { currentCount: 1, lastActivity: now },
      });
    } else if (shouldIncrementStreak("daily_checkin", dailyStreak.lastActivity, now)) {
      const newCount = dailyStreak.currentCount + 1;
      await prisma.streak.update({
        where: { id: dailyStreak.id },
        data: { currentCount: newCount, longestCount: Math.max(newCount, dailyStreak.longestCount), lastActivity: now },
      });
      if (isStreakMilestone(newCount)) {
        await awardAction(userId, { action: "streak_milestone", streakCount: newCount });
      }
    }
  } else {
    await prisma.streak.create({
      data: { userId, streakType: "daily_checkin", currentCount: 1, longestCount: 1, lastActivity: now },
    });
  }

  // Weekly momentum (on task completion)
  if (actionType === "complete_task") {
    const weeklyStreak = await prisma.streak.findUnique({
      where: { userId_streakType: { userId, streakType: "weekly_momentum" } },
    });

    if (weeklyStreak) {
      if (shouldResetStreak("weekly_momentum", weeklyStreak.lastActivity, now)) {
        await prisma.streak.update({ where: { id: weeklyStreak.id }, data: { currentCount: 1, lastActivity: now } });
      } else if (shouldIncrementStreak("weekly_momentum", weeklyStreak.lastActivity, now)) {
        const newCount = weeklyStreak.currentCount + 1;
        await prisma.streak.update({
          where: { id: weeklyStreak.id },
          data: { currentCount: newCount, longestCount: Math.max(newCount, weeklyStreak.longestCount), lastActivity: now },
        });
      } else {
        await prisma.streak.update({ where: { id: weeklyStreak.id }, data: { lastActivity: now } });
      }
    } else {
      await prisma.streak.create({
        data: { userId, streakType: "weekly_momentum", currentCount: 1, longestCount: 1, lastActivity: now },
      });
    }
  }
}

async function evaluateNewBadges(userId: string) {
  const [awards, earnedAwardIds, stats] = await Promise.all([
    prisma.award.findMany({ where: { isActive: true } }),
    prisma.userAward.findMany({ where: { userId }, select: { awardId: true } }),
    getUserStats(userId),
  ]);

  const earnedIds = new Set(earnedAwardIds.map((a) => a.awardId));

  for (const award of awards) {
    if (earnedIds.has(award.id)) continue;
    const criteria = { type: award.criteriaType, value: award.criteriaValue } as BadgeCriteria;
    if (evaluateCriteria(criteria, stats)) {
      await prisma.userAward.create({ data: { userId, awardId: award.id } });
      await createNotification(userId, "badge_earned", "Badge Earned!", `You earned the "${award.name}" badge!`);
    }
  }
}

async function getUserStats(userId: string): Promise<UserStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [pointsResult, pointsLedger, streaks, todayLedger] = await Promise.all([
    prisma.pointsLedger.aggregate({ where: { userId }, _sum: { points: true } }),
    prisma.pointsLedger.findMany({ where: { userId } }),
    prisma.streak.findMany({ where: { userId } }),
    prisma.pointsLedger.findMany({ where: { userId, timestamp: { gte: today } } }),
  ]);

  const actionCounts: Record<string, number> = {};
  for (const entry of pointsLedger) {
    actionCounts[entry.actionType] = (actionCounts[entry.actionType] || 0) + 1;
  }

  const todayCounts: Record<string, number> = {};
  for (const entry of todayLedger) {
    todayCounts[entry.actionType] = (todayCounts[entry.actionType] || 0) + 1;
  }

  const streakMap: Record<string, number> = {};
  for (const s of streaks) { streakMap[s.streakType] = s.currentCount; }

  const consecutiveCounts: Record<string, number> = {};
  if (streakMap["on_time_completion"]) {
    consecutiveCounts["complete_on_time"] = streakMap["on_time_completion"];
  }

  return { action_counts: actionCounts, total_points: pointsResult._sum.points || 0, streaks: streakMap, today_counts: todayCounts, consecutive_counts: consecutiveCounts };
}
