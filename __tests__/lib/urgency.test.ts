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
  it("+5 for 3-7 days (no effort specified defaults to small +2)", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: new Date("2026-03-28") }, today)).toBe(27);
  });
  it("+10 for 1-2 days (no effort specified defaults to small +2)", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: new Date("2026-03-25") }, today)).toBe(32);
  });
  it("+20 for due today (no effort specified defaults to small +2)", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: today }, today)).toBe(42);
  });
  it("+36 for 3 days overdue (no effort specified defaults to small +2)", () => {
    expect(calculateUrgencyScore({ priority: "low", status: "not_started", dueDate: new Date("2026-03-20") }, today)).toBe(48);
  });
  it("combines modifiers (no effort specified defaults to small +2)", () => {
    expect(calculateUrgencyScore({ priority: "low", status: "blocked", dueDate: new Date("2026-03-20") }, today)).toBe(53);
  });

  // Effort estimate modifier
  it("+2 effort bonus for small task due within 7 days", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: new Date("2026-03-25"), effortEstimate: "small" }, today)).toBe(32);
  });
  it("+4 effort bonus for medium task due within 7 days", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: new Date("2026-03-25"), effortEstimate: "medium" }, today)).toBe(34);
  });
  it("+8 effort bonus for large task due within 7 days", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: new Date("2026-03-25"), effortEstimate: "large" }, today)).toBe(38);
  });
  it("no effort bonus when due date is 7+ days away", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: new Date("2026-03-31"), effortEstimate: "large" }, today)).toBe(20);
  });
  it("no effort bonus when no due date", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: null, effortEstimate: "large" }, today)).toBe(20);
  });
  it("large overdue task gets effort bonus", () => {
    // low(10) + overdue 3 days(36) + large effort(8) = 54    expect(calculateUrgencyScore({ priority: "low", status: "not_started", dueDate: new Date("2026-03-20"), effortEstimate: "large" }, today)).toBe(54);
  });
});
