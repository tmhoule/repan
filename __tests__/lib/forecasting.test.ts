import { getWeeklyThroughput, calculateBacklogForecast, formatForecast } from "@/lib/forecasting";

describe("getWeeklyThroughput", () => {
  it("calculates 4-week average", () => {
    const tasks = [
      { effortEstimate: "small" as const, completedAt: new Date("2026-03-02") },
      { effortEstimate: "small" as const, completedAt: new Date("2026-03-09") },
      { effortEstimate: "medium" as const, completedAt: new Date("2026-03-16") },
      { effortEstimate: "large" as const, completedAt: new Date("2026-03-20") },
    ];
    expect(getWeeklyThroughput(tasks, new Date("2026-03-23"))).toBe(2.5);
  });
  it("returns 0 for empty", () => { expect(getWeeklyThroughput([], new Date())).toBe(0); });
});

describe("calculateBacklogForecast", () => {
  it("calculates weeks to start", () => {
    const backlog = [
      { id: "1", effortEstimate: "medium" as const, backlogPosition: 1 },
      { id: "2", effortEstimate: "large" as const, backlogPosition: 2 },
      { id: "3", effortEstimate: "small" as const, backlogPosition: 3 },
    ];
    const result = calculateBacklogForecast(backlog, 5);
    expect(result[0]).toEqual({ id: "1", effortAhead: 0, weeksToStart: 0 });
    expect(result[1]).toEqual({ id: "2", effortAhead: 3, weeksToStart: 0.6 });
    expect(result[2]).toEqual({ id: "3", effortAhead: 8, weeksToStart: 1.6 });
  });
  it("null weeks when 0 throughput", () => {
    const result = calculateBacklogForecast([{ id: "1", effortEstimate: "medium" as const, backlogPosition: 1 }], 0);
    expect(result[0].weeksToStart).toBeNull();
  });
});

describe("formatForecast", () => {
  it("< 1 week", () => { expect(formatForecast(0.5)).toBe("< 1 week"); });
  it("~1-2 weeks", () => { expect(formatForecast(1.5)).toBe("~1-2 weeks"); });
  it("~2-3 weeks", () => { expect(formatForecast(2.5)).toBe("~2-3 weeks"); });
  it("~3-4 weeks", () => { expect(formatForecast(3.5)).toBe("~3-4 weeks"); });
  it("months", () => { expect(formatForecast(6)).toBe("~1-2 months"); });
  it("null", () => { expect(formatForecast(null)).toBe("Unknown"); });
});
