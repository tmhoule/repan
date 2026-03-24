const EFFORT_POINTS: Record<string, number> = { small: 1, medium: 3, large: 5 };

type CompletedTask = { effortEstimate: string; completedAt: Date };
type BacklogItem = { id: string; effortEstimate: string; backlogPosition: number };
type ForecastResult = { id: string; effortAhead: number; weeksToStart: number | null };

export function getEffortPoints(estimate: string): number { return EFFORT_POINTS[estimate] ?? 1; }

export function getWeeklyThroughput(completedTasks: CompletedTask[], now: Date): number {
  const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000);
  const recent = completedTasks.filter(t => t.completedAt >= fourWeeksAgo && t.completedAt <= now);
  return recent.reduce((sum, t) => sum + getEffortPoints(t.effortEstimate), 0) / 4;
}

export function calculateBacklogForecast(backlog: BacklogItem[], weeklyThroughput: number): ForecastResult[] {
  const sorted = [...backlog].sort((a, b) => a.backlogPosition - b.backlogPosition);
  let cum = 0;
  return sorted.map(item => {
    const ahead = cum;
    cum += getEffortPoints(item.effortEstimate);
    return { id: item.id, effortAhead: ahead, weeksToStart: weeklyThroughput > 0 ? ahead / weeklyThroughput : null };
  });
}

export function formatForecast(weeks: number | null): string {
  if (weeks === null) return "Unknown";
  if (weeks < 1) return "< 1 week";
  if (weeks < 2) return "~1-2 weeks";
  if (weeks < 3) return "~2-3 weeks";
  if (weeks < 4) return "~3-4 weeks";
  const months = weeks / 4;
  if (months < 2) return "~1-2 months";
  return `~${Math.floor(months)}-${Math.ceil(months)} months`;
}

export function getBacklogHealth(backlog: BacklogItem[], weeklyThroughput: number, previousBacklogSize?: number) {
  const totalItems = backlog.length;
  const totalEffort = backlog.reduce((sum, item) => sum + getEffortPoints(item.effortEstimate), 0);
  const estimatedWeeks = weeklyThroughput > 0 ? totalEffort / weeklyThroughput : null;
  let trend: "growing" | "shrinking" | "stable" = "stable";
  if (previousBacklogSize !== undefined) {
    if (totalItems > previousBacklogSize) trend = "growing";
    else if (totalItems < previousBacklogSize) trend = "shrinking";
  }
  return { totalItems, totalEffort, estimatedWeeks, trend };
}
