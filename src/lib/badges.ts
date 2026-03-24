export type BadgeCriteria =
  | { type: "count_action"; value: { action: string; count: number } }
  | { type: "streak_milestone"; value: { streak_type: string; count: number } }
  | { type: "consecutive_action"; value: { action: string; count: number } }
  | { type: "single_day_count"; value: { action: string; count: number } }
  | { type: "total_points"; value: { count: number } }
  | { type: "compound"; value: { operator: "AND" | "OR"; criteria: BadgeCriteria[] } };

export type UserStats = {
  action_counts?: Record<string, number>;
  total_points?: number;
  streaks?: Record<string, number>;
  today_counts?: Record<string, number>;
  consecutive_counts?: Record<string, number>;
};

export function evaluateCriteria(criteria: BadgeCriteria, stats: UserStats): boolean {
  switch (criteria.type) {
    case "count_action": return (stats.action_counts?.[criteria.value.action] ?? 0) >= criteria.value.count;
    case "total_points": return (stats.total_points ?? 0) >= criteria.value.count;
    case "streak_milestone": return (stats.streaks?.[criteria.value.streak_type] ?? 0) >= criteria.value.count;
    case "single_day_count": return (stats.today_counts?.[criteria.value.action] ?? 0) >= criteria.value.count;
    case "consecutive_action": return (stats.consecutive_counts?.[criteria.value.action] ?? 0) >= criteria.value.count;
    case "compound": {
      const r = criteria.value.criteria.map(c => evaluateCriteria(c, stats));
      return criteria.value.operator === "AND" ? r.every(Boolean) : r.some(Boolean);
    }
    default: return false;
  }
}
