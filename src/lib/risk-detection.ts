import { prisma } from "./db";

export type RiskType = "blocked" | "stalled" | "overdue" | "behind_schedule" | "stale" | "unassigned_approaching";

export interface RiskFlag {
  riskType: RiskType;
  label: string;
}

const STALE_THRESHOLD_IN_PROGRESS = 3; // days
const STALE_THRESHOLD_NOT_STARTED = 5; // days (only if has due date)

interface TaskForRisk {
  id: string;
  status: string;
  percentComplete: number;
  dueDate: Date | null;
  createdAt: Date;
  assignedToId: string | null;
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
  if (task.status === "done" || task.status === "boulder") return false;

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
 * Only applies to tasks with a due date that haven't been completed.
 */
export function isBehindSchedule(task: TaskForRisk, now: Date): boolean {
  if (!task.dueDate || task.status === "done" || task.status === "boulder") return false;
  if (!task.assignedToId) return false; // backlog tasks handled separately

  const totalDuration = task.dueDate.getTime() - task.createdAt.getTime();
  if (totalDuration <= 0) return false;

  const elapsed = now.getTime() - task.createdAt.getTime();
  const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);

  // Behind if actual progress is more than 25 points below expected
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
export function getRiskFlags(task: TaskForRisk, lastActivity: Date | undefined, now: Date): RiskFlag[] {
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
  if (isBehindSchedule(task, now)) {
    flags.push({ riskType: "behind_schedule", label: "Behind schedule" });
  }
  if (isStale(task, lastActivity, now)) {
    const days = getDaysSinceActivity(task, lastActivity, now);
    flags.push({ riskType: "stale", label: `No activity ${days}d` });
  }

  return flags;
}
