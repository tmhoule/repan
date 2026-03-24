export type PointAction =
  | { action: "complete_task"; effortEstimate: "small" | "medium" | "large" }
  | { action: "complete_on_time" }
  | { action: "progress_update" }
  | { action: "comment" }
  | { action: "resolve_blocker" }
  | { action: "claim_backlog" }
  | { action: "streak_milestone"; streakCount: number };

const COMPLETION_POINTS: Record<string, number> = { small: 10, medium: 15, large: 25 };
const STREAK_MILESTONES: Record<number, number> = { 3: 5, 5: 10, 10: 20, 30: 50 };

export function calculatePoints(input: PointAction): number {
  switch (input.action) {
    case "complete_task": return COMPLETION_POINTS[input.effortEstimate] ?? 10;
    case "complete_on_time": return 5;
    case "progress_update": return 2;
    case "comment": return 1;
    case "resolve_blocker": return 5;
    case "claim_backlog": return 3;
    case "streak_milestone": return STREAK_MILESTONES[input.streakCount] ?? 0;
  }
}
