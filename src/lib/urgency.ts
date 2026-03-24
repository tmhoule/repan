type UrgencyInput = {
  priority: "high" | "medium" | "low";
  status: string;
  dueDate: Date | null;
  effortEstimate?: "small" | "medium" | "large" | string;
};

const BASE_PRIORITY: Record<string, number> = { high: 30, medium: 20, low: 10 };

// Effort modifier: larger tasks need more lead time, so they get a bump
// when a due date is approaching. The idea: a large task due soon is more
// urgent than a small task due at the same time because you need to start earlier.
const EFFORT_WEIGHT: Record<string, number> = { large: 8, medium: 4, small: 0 };

export function calculateUrgencyScore(task: UrgencyInput, now: Date = new Date()): number {
  let score = BASE_PRIORITY[task.priority] ?? 10;

  // Status modifier
  if (task.status === "blocked" || task.status === "stalled") score += 5;

  // Due date modifier
  if (task.dueDate) {
    const daysUntilDue = Math.floor((task.dueDate.getTime() - now.getTime()) / 86400000);
    if (daysUntilDue < 0) score += 30 + Math.abs(daysUntilDue) * 2;
    else if (daysUntilDue === 0) score += 20;
    else if (daysUntilDue <= 2) score += 10;
    else if (daysUntilDue <= 7) score += 5;

    // Effort modifier: only applies when there IS a due date.
    // Large tasks with upcoming deadlines get an extra bump because
    // they need more time to complete.
    const effortBonus = EFFORT_WEIGHT[task.effortEstimate ?? "small"] ?? 0;
    if (daysUntilDue <= 7) {
      score += effortBonus;
    }
  }

  return score;
}

export function sortByUrgency<T extends UrgencyInput & { createdAt: Date }>(tasks: T[], now: Date = new Date()): T[] {
  return [...tasks].sort((a, b) => {
    const diff = calculateUrgencyScore(b, now) - calculateUrgencyScore(a, now);
    if (diff !== 0) return diff;
    if (a.dueDate && b.dueDate) { const d = a.dueDate.getTime() - b.dueDate.getTime(); if (d !== 0) return d; }
    else if (a.dueDate) return -1;
    else if (b.dueDate) return 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}
