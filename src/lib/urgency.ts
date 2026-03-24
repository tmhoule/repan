type UrgencyInput = {
  priority: "high" | "medium" | "low";
  status: string;
  dueDate: Date | null;
};

const BASE_PRIORITY: Record<string, number> = { high: 30, medium: 20, low: 10 };

export function calculateUrgencyScore(task: UrgencyInput, now: Date = new Date()): number {
  let score = BASE_PRIORITY[task.priority] ?? 10;
  if (task.status === "blocked" || task.status === "stalled") score += 5;
  if (task.dueDate) {
    const daysUntilDue = Math.floor((task.dueDate.getTime() - now.getTime()) / 86400000);
    if (daysUntilDue < 0) score += 30 + Math.abs(daysUntilDue) * 2;
    else if (daysUntilDue === 0) score += 20;
    else if (daysUntilDue <= 2) score += 10;
    else if (daysUntilDue <= 7) score += 5;
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
