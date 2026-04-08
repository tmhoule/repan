jest.mock("@/lib/db", () => ({ prisma: {} }));

import { computeUserSnapshot } from "@/lib/workload-snapshot";

describe("computeUserSnapshot", () => {
  const teamWeights = {
    weightHigh: 60,
    weightMedium: 35,
    weightLow: 10,
    multiplierBlocked: 5,
    multiplierStalled: 25,
  };

  it("returns zero snapshot for user with no tasks", () => {
    const result = computeUserSnapshot([], teamWeights);
    expect(result).toEqual({
      workloadScore: 0,
      taskCount: 0,
      boulderAllocation: 0,
      blockedCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    });
  });

  it("computes correct score for active tasks with priority weights", () => {
    const tasks = [
      { status: "in_progress", priority: "high", timeAllocation: 0 },
      { status: "not_started", priority: "medium", timeAllocation: 0 },
      { status: "in_progress", priority: "low", timeAllocation: 0 },
    ];
    const result = computeUserSnapshot(tasks, teamWeights);
    expect(result.workloadScore).toBe(60 + 35 + 10);
    expect(result.taskCount).toBe(3);
    expect(result.highCount).toBe(1);
    expect(result.mediumCount).toBe(1);
    expect(result.lowCount).toBe(1);
    expect(result.blockedCount).toBe(0);
    expect(result.boulderAllocation).toBe(0);
  });

  it("applies blocked multiplier", () => {
    const tasks = [
      { status: "blocked", priority: "high", timeAllocation: 0 },
    ];
    const result = computeUserSnapshot(tasks, teamWeights);
    expect(result.workloadScore).toBe(3);
    expect(result.blockedCount).toBe(1);
    expect(result.taskCount).toBe(1);
  });

  it("applies stalled multiplier for stalled and paused", () => {
    const tasks = [
      { status: "stalled", priority: "medium", timeAllocation: 0 },
      { status: "paused", priority: "low", timeAllocation: 0 },
    ];
    const result = computeUserSnapshot(tasks, teamWeights);
    expect(result.workloadScore).toBe(9 + 3);
    expect(result.blockedCount).toBe(2);
    expect(result.taskCount).toBe(2);
  });

  it("sums boulder time allocation separately", () => {
    const tasks = [
      { status: "boulder", priority: "medium", timeAllocation: 20 },
      { status: "boulder", priority: "medium", timeAllocation: 15 },
      { status: "in_progress", priority: "high", timeAllocation: 0 },
    ];
    const result = computeUserSnapshot(tasks, teamWeights);
    expect(result.boulderAllocation).toBe(35);
    expect(result.taskCount).toBe(1);
    expect(result.workloadScore).toBe(60);
  });

  it("excludes done tasks entirely", () => {
    const tasks = [
      { status: "done", priority: "high", timeAllocation: 0 },
      { status: "in_progress", priority: "low", timeAllocation: 0 },
    ];
    const result = computeUserSnapshot(tasks, teamWeights);
    expect(result.workloadScore).toBe(10);
    expect(result.taskCount).toBe(1);
  });
});
