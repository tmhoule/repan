import { calculatePoints } from "@/lib/points";

describe("calculatePoints", () => {
  it("10 for small task", () => { expect(calculatePoints({ action: "complete_task", effortEstimate: "small" })).toBe(10); });
  it("15 for medium task", () => { expect(calculatePoints({ action: "complete_task", effortEstimate: "medium" })).toBe(15); });
  it("25 for large task", () => { expect(calculatePoints({ action: "complete_task", effortEstimate: "large" })).toBe(25); });
  it("5 for on-time", () => { expect(calculatePoints({ action: "complete_on_time" })).toBe(5); });
  it("2 for progress", () => { expect(calculatePoints({ action: "progress_update" })).toBe(2); });
  it("1 for comment", () => { expect(calculatePoints({ action: "comment" })).toBe(1); });
  it("5 for blocker", () => { expect(calculatePoints({ action: "resolve_blocker" })).toBe(5); });
  it("3 for backlog claim", () => { expect(calculatePoints({ action: "claim_backlog" })).toBe(3); });
  it("streak milestones", () => {
    expect(calculatePoints({ action: "streak_milestone", streakCount: 3 })).toBe(5);
    expect(calculatePoints({ action: "streak_milestone", streakCount: 5 })).toBe(10);
    expect(calculatePoints({ action: "streak_milestone", streakCount: 10 })).toBe(20);
    expect(calculatePoints({ action: "streak_milestone", streakCount: 30 })).toBe(50);
  });
  it("0 for non-milestone", () => { expect(calculatePoints({ action: "streak_milestone", streakCount: 7 })).toBe(0); });
});
