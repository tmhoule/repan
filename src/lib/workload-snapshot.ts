import { prisma } from "./db";

interface TeamWeights {
  weightHigh: number;
  weightMedium: number;
  weightLow: number;
  multiplierBlocked: number;
  multiplierStalled: number;
}

interface TaskForSnapshot {
  status: string;
  priority: string;
  timeAllocation: number;
}

export interface SnapshotData {
  workloadScore: number;
  taskCount: number;
  boulderAllocation: number;
  blockedCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export function computeUserSnapshot(
  tasks: TaskForSnapshot[],
  weights: TeamWeights
): SnapshotData {
  let workloadScore = 0;
  let taskCount = 0;
  let boulderAllocation = 0;
  let blockedCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  for (const t of tasks) {
    if (t.status === "done") continue;

    if (t.status === "boulder") {
      boulderAllocation += t.timeAllocation ?? 0;
      continue;
    }

    taskCount++;
    if (t.priority === "high") highCount++;
    else if (t.priority === "medium") mediumCount++;
    else lowCount++;

    if (t.status === "blocked" || t.status === "stalled" || t.status === "paused") {
      blockedCount++;
    }

    let weight =
      t.priority === "high"
        ? weights.weightHigh
        : t.priority === "medium"
          ? weights.weightMedium
          : weights.weightLow;

    if (t.status === "blocked") {
      weight = Math.round((weight * weights.multiplierBlocked) / 100);
    } else if (t.status === "stalled" || t.status === "paused") {
      weight = Math.round((weight * weights.multiplierStalled) / 100);
    }

    workloadScore += weight;
  }

  return {
    workloadScore,
    taskCount,
    boulderAllocation,
    blockedCount,
    highCount,
    mediumCount,
    lowCount,
  };
}

/**
 * Record daily workload snapshots for all active members of a team.
 * Uses upsert so re-runs on the same day are idempotent.
 * Returns the number of snapshots recorded.
 */
export async function recordTeamSnapshots(teamId: string, date: Date): Promise<number> {
  const team = await prisma.team.findUniqueOrThrow({
    where: { id: teamId },
    select: {
      weightHigh: true,
      weightMedium: true,
      weightLow: true,
      multiplierBlocked: true,
      multiplierStalled: true,
    },
  });

  const memberships = await prisma.teamMembership.findMany({
    where: { teamId },
    include: { user: { select: { id: true, isActive: true } } },
  });
  const activeUserIds = memberships.filter((m) => m.user.isActive).map((m) => m.user.id);

  if (activeUserIds.length === 0) return 0;

  const tasks = await prisma.task.findMany({
    where: {
      teamId,
      archivedAt: null,
      assignedToId: { in: activeUserIds },
      status: { not: "done" },
    },
    select: {
      assignedToId: true,
      status: true,
      priority: true,
      timeAllocation: true,
    },
  });

  // Midnight UTC for the snapshot date
  const snapshotDate = new Date(date);
  snapshotDate.setUTCHours(0, 0, 0, 0);

  let count = 0;
  for (const userId of activeUserIds) {
    const userTasks = tasks.filter((t) => t.assignedToId === userId);
    const data = computeUserSnapshot(userTasks, team);

    await prisma.workloadSnapshot.upsert({
      where: {
        userId_teamId_date: { userId, teamId, date: snapshotDate },
      },
      create: {
        userId,
        teamId,
        date: snapshotDate,
        ...data,
      },
      update: data,
    });
    count++;
  }

  return count;
}
