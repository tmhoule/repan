import { prisma } from "./db";

export type RiskType = "blocked" | "stalled" | "overdue" | "behind_schedule" | "stale" | "unassigned_approaching";

export interface RiskFlag {
  riskType: RiskType;
  label: string;
}

export interface CycleTimes {
  small: number;
  medium: number;
  large: number;
}

const DEFAULT_CYCLE_TIMES: CycleTimes = { small: 3, medium: 7, large: 14 };
const MIN_SAMPLE_SIZE = 2;

const STALE_THRESHOLD_IN_PROGRESS = 3; // days
const STALE_THRESHOLD_NOT_STARTED = 5; // days (only if has due date)

interface TaskForRisk {
  id: string;
  status: string;
  percentComplete: number;
  dueDate: Date | null;
  createdAt: Date;
  assignedToId: string | null;
  effortEstimate: string;
}

/**
 * Get the last activity timestamp for a set of tasks (batch query).
 * Returns a map of taskId -> last activity timestamp.
 */
export async function getLastActivityMap(taskIds: string[]): Promise<Map<string, Date>> {
  if (taskIds.length === 0) return new Map();

  const results = await prisma.taskActivity.groupBy({
    by: ["taskId"],
    where: { taskId: { in: taskIds } },
    _max: { timestamp: true },
  });

  const map = new Map<string, Date>();
  for (const r of results) {
    if (r._max.timestamp) {
      map.set(r.taskId, r._max.timestamp);
    }
  }
  return map;
}

/**
 * Detect if a task is stale (no activity for N days).
 */
export function isStale(task: TaskForRisk, lastActivity: Date | undefined, now: Date): boolean {
  if (task.status === "done" || task.status === "boulder" || task.status === "paused") return false;

  const reference = lastActivity ?? task.createdAt;
  const daysSinceActivity = (now.getTime() - reference.getTime()) / 86400000;

  if (task.status === "in_progress") {
    return daysSinceActivity >= STALE_THRESHOLD_IN_PROGRESS;
  }

  // not_started with a due date
  if (task.status === "not_started" && task.dueDate) {
    return daysSinceActivity >= STALE_THRESHOLD_NOT_STARTED;
  }

  return false;
}

/**
 * Detect if a task is behind schedule based on expected vs actual progress.
 * Uses team cycle times to skip tasks with plenty of runway relative to their effort.
 */
export function isBehindSchedule(task: TaskForRisk, now: Date, cycleTimes?: CycleTimes): boolean {
  if (!task.dueDate || task.status === "done" || task.status === "boulder") return false;
  if (!task.assignedToId) return false;

  // Cycle-time grace check: if plenty of runway remains, not behind
  if (cycleTimes) {
    const runway = (task.dueDate.getTime() - now.getTime()) / 86400000;
    const expectedDuration = cycleTimes[task.effortEstimate as keyof CycleTimes] ?? 7;
    if (runway > expectedDuration * 1.5) return false;
  }

  const totalDuration = task.dueDate.getTime() - task.createdAt.getTime();
  if (totalDuration <= 0) return false;

  const elapsed = now.getTime() - task.createdAt.getTime();
  const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);

  return task.percentComplete < expectedProgress - 25;
}

/**
 * Get the days since last activity for a task.
 */
export function getDaysSinceActivity(task: TaskForRisk, lastActivity: Date | undefined, now: Date): number {
  const reference = lastActivity ?? task.createdAt;
  return Math.floor((now.getTime() - reference.getTime()) / 86400000);
}

/**
 * Compute all risk flags for a task.
 */
export function getRiskFlags(task: TaskForRisk, lastActivity: Date | undefined, now: Date, cycleTimes?: CycleTimes): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (task.status === "blocked") {
    flags.push({ riskType: "blocked", label: "Blocked" });
  }
  if (task.status === "stalled") {
    flags.push({ riskType: "stalled", label: "Stalled" });
  }
  if (task.dueDate && task.dueDate < now) {
    flags.push({ riskType: "overdue", label: "Overdue" });
  }
  if (!task.assignedToId && task.dueDate) {
    const daysUntilDue = Math.ceil((task.dueDate.getTime() - now.getTime()) / 86400000);
    if (daysUntilDue <= 7) {
      flags.push({ riskType: "unassigned_approaching", label: "Unassigned & due soon" });
    }
  }
  if (isBehindSchedule(task, now, cycleTimes)) {
    flags.push({ riskType: "behind_schedule", label: "Behind schedule" });
  }
  if (isStale(task, lastActivity, now)) {
    const days = getDaysSinceActivity(task, lastActivity, now);
    flags.push({ riskType: "stale", label: `No activity ${days}d` });
  }

  return flags;
}

/**
 * Compute team-average cycle times (in days) per effort size from completed tasks.
 * Falls back to defaults when fewer than MIN_SAMPLE_SIZE completions exist for a size.
 */
export async function getTeamCycleTimes(teamId: string): Promise<CycleTimes> {
  const completed = await prisma.task.findMany({
    where: { teamId, status: "done", startedAt: { not: null }, completedAt: { not: null } },
    select: { effortEstimate: true, startedAt: true, completedAt: true },
  });

  const totals: Record<string, { sum: number; count: number }> = {
    small: { sum: 0, count: 0 },
    medium: { sum: 0, count: 0 },
    large: { sum: 0, count: 0 },
  };

  for (const t of completed) {
    const days = (t.completedAt!.getTime() - t.startedAt!.getTime()) / 86400000;
    if (totals[t.effortEstimate]) {
      totals[t.effortEstimate].sum += days;
      totals[t.effortEstimate].count++;
    }
  }

  return {
    small: totals.small.count >= MIN_SAMPLE_SIZE ? Math.round(totals.small.sum / totals.small.count) : DEFAULT_CYCLE_TIMES.small,
    medium: totals.medium.count >= MIN_SAMPLE_SIZE ? Math.round(totals.medium.sum / totals.medium.count) : DEFAULT_CYCLE_TIMES.medium,
    large: totals.large.count >= MIN_SAMPLE_SIZE ? Math.round(totals.large.sum / totals.large.count) : DEFAULT_CYCLE_TIMES.large,
  };
}
