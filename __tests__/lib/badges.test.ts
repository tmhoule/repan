import { evaluateCriteria, BadgeCriteria } from "@/lib/badges";

describe("evaluateCriteria", () => {
  it("count_action true", () => { expect(evaluateCriteria({ type: "count_action", value: { action: "complete_task", count: 5 } }, { action_counts: { complete_task: 5 } })).toBe(true); });
  it("count_action false", () => { expect(evaluateCriteria({ type: "count_action", value: { action: "complete_task", count: 5 } }, { action_counts: { complete_task: 3 } })).toBe(false); });
  it("total_points", () => { expect(evaluateCriteria({ type: "total_points", value: { count: 100 } }, { total_points: 150 })).toBe(true); });
  it("streak_milestone", () => { expect(evaluateCriteria({ type: "streak_milestone", value: { streak_type: "daily_checkin", count: 10 } }, { streaks: { daily_checkin: 10 } })).toBe(true); });
  it("single_day_count", () => { expect(evaluateCriteria({ type: "single_day_count", value: { action: "complete_task", count: 3 } }, { today_counts: { complete_task: 3 } })).toBe(true); });
  it("consecutive_action", () => { expect(evaluateCriteria({ type: "consecutive_action", value: { action: "complete_on_time", count: 5 } }, { consecutive_counts: { complete_on_time: 5 } })).toBe(true); });
  it("compound AND true", () => {
    expect(evaluateCriteria({ type: "compound", value: { operator: "AND", criteria: [
      { type: "count_action", value: { action: "complete_task", count: 10 } },
      { type: "total_points", value: { count: 50 } }
    ] } }, { action_counts: { complete_task: 10 }, total_points: 60 })).toBe(true);
  });
  it("compound AND false", () => {
    expect(evaluateCriteria({ type: "compound", value: { operator: "AND", criteria: [
      { type: "count_action", value: { action: "complete_task", count: 10 } },
      { type: "total_points", value: { count: 50 } }
    ] } }, { action_counts: { complete_task: 10 }, total_points: 30 })).toBe(false);
  });
  it("compound OR", () => {
    expect(evaluateCriteria({ type: "compound", value: { operator: "OR", criteria: [
      { type: "count_action", value: { action: "complete_task", count: 10 } },
      { type: "total_points", value: { count: 50 } }
    ] } }, { action_counts: { complete_task: 3 }, total_points: 60 })).toBe(true);
  });
});
