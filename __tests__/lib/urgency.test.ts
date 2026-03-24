import { calculateUrgencyScore } from "@/lib/urgency";

describe("calculateUrgencyScore", () => {
  const today = new Date("2026-03-23");

  it("returns 30 for high priority, no due date", () => {
    expect(calculateUrgencyScore({ priority: "high", status: "not_started", dueDate: null }, today)).toBe(30);
  });
  it("returns 20 for medium priority", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: null }, today)).toBe(20);
  });
  it("returns 10 for low priority", () => {
    expect(calculateUrgencyScore({ priority: "low", status: "not_started", dueDate: null }, today)).toBe(10);
  });
  it("+5 for blocked", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "blocked", dueDate: null }, today)).toBe(25);
  });
  it("+5 for stalled", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "stalled", dueDate: null }, today)).toBe(25);
  });
  it("+0 for 7+ days", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: new Date("2026-03-31") }, today)).toBe(20);
  });
  it("+5 for 3-7 days", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: new Date("2026-03-28") }, today)).toBe(25);
  });
  it("+10 for 1-2 days", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: new Date("2026-03-25") }, today)).toBe(30);
  });
  it("+20 for due today", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: today }, today)).toBe(40);
  });
  it("+36 for 3 days overdue", () => {
    expect(calculateUrgencyScore({ priority: "low", status: "not_started", dueDate: new Date("2026-03-20") }, today)).toBe(46);
  });
  it("combines modifiers", () => {
    expect(calculateUrgencyScore({ priority: "low", status: "blocked", dueDate: new Date("2026-03-20") }, today)).toBe(51);
  });
});
