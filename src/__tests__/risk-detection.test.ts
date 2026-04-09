import { getTeamCycleTimes, isBehindSchedule, getRiskFlags, CycleTimes } from "@/lib/risk-detection";
import { prisma } from "@/lib/db";

jest.mock("@/lib/db", () => ({
  prisma: {
    task: { findMany: jest.fn() },
    taskActivity: { groupBy: jest.fn() },
  },
}));

const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

describe("getTeamCycleTimes", () => {
  beforeEach(() => jest.clearAllMocks());

  it("computes average cycle time per effort size from completed tasks", async () => {
    (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
      { effortEstimate: "small", startedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-04") }, // 3 days
      { effortEstimate: "small", startedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-06") }, // 5 days
      { effortEstimate: "medium", startedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-08") }, // 7 days
      { effortEstimate: "medium", startedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-10") }, // 9 days
      { effortEstimate: "medium", startedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-12") }, // 11 days
      { effortEstimate: "large", startedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-15") }, // 14 days
      { effortEstimate: "large", startedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-22") }, // 21 days
      { effortEstimate: "large", startedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-29") }, // 28 days
    ]);

    const result = await getTeamCycleTimes("team-1");

    expect(result).toEqual({ small: 4, medium: 9, large: 21 });
  });

  it("uses fallback defaults when fewer than 2 completions for a size", async () => {
    (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([
      { effortEstimate: "small", startedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-04") }, // only 1
      { effortEstimate: "medium", startedAt: new Date("2026-01-01"), completedAt: new Date("2026-01-08") }, // only 1
    ]);

    const result = await getTeamCycleTimes("team-1");

    // small & medium fall back to defaults, large falls back to default
    expect(result).toEqual({ small: 3, medium: 7, large: 14 });
  });

  it("returns all defaults for a team with no completed tasks", async () => {
    (mockedPrisma.task.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getTeamCycleTimes("team-1");

    expect(result).toEqual({ small: 3, medium: 7, large: 14 });
  });
});

describe("isBehindSchedule with cycle times", () => {
  const cycleTimes: CycleTimes = { small: 3, medium: 7, large: 14 };

  function makeTask(overrides: Partial<{
    status: string; percentComplete: number; dueDate: Date | null;
    createdAt: Date; assignedToId: string | null; effortEstimate: string;
  }>) {
    return {
      id: "t1",
      status: "in_progress",
      percentComplete: 0,
      dueDate: null as Date | null,
      createdAt: new Date("2026-01-01"),
      assignedToId: "u1",
      effortEstimate: "small",
      ...overrides,
    };
  }

  it("returns false when runway exceeds 1.5x expected cycle time", () => {
    // Small task, cycle time = 3 days, 1.5x = 4.5 days
    // Due in 30 days — way more than 4.5 days of runway
    const now = new Date("2026-01-15");
    const task = makeTask({
      effortEstimate: "small",
      dueDate: new Date("2026-02-15"), // 31 days of runway
      percentComplete: 0,
      createdAt: new Date("2026-01-01"),
    });

    expect(isBehindSchedule(task, now, cycleTimes)).toBe(false);
  });

  it("falls through to linear check when runway is within 1.5x cycle time", () => {
    // Small task, cycle time = 3 days, 1.5x = 4.5 days
    // Due in 4 days — within threshold, so linear check applies
    // Created 10 days ago, 0% complete, expected ~71% → behind by 46+ points
    const now = new Date("2026-01-11");
    const task = makeTask({
      effortEstimate: "small",
      dueDate: new Date("2026-01-15"), // 4 days runway
      percentComplete: 0,
      createdAt: new Date("2026-01-01"),
    });

    expect(isBehindSchedule(task, now, cycleTimes)).toBe(true);
  });

  it("returns false within runway window if progress is adequate", () => {
    // Due in 2 days (within 1.5x of small=3), but 80% complete — not behind
    const now = new Date("2026-01-13");
    const task = makeTask({
      effortEstimate: "small",
      dueDate: new Date("2026-01-15"),
      percentComplete: 80,
      createdAt: new Date("2026-01-01"),
    });

    expect(isBehindSchedule(task, now, cycleTimes)).toBe(false);
  });

  it("works correctly for large effort tasks with long runway", () => {
    // Large task, cycle time = 14 days, 1.5x = 21 days
    // Due in 60 days, 0% complete — should NOT be flagged
    const now = new Date("2026-01-15");
    const task = makeTask({
      effortEstimate: "large",
      dueDate: new Date("2026-03-16"), // 60 days runway
      percentComplete: 0,
      createdAt: new Date("2026-01-01"),
    });

    expect(isBehindSchedule(task, now, cycleTimes)).toBe(false);
  });

  it("still flags large task when runway is tight and no progress", () => {
    // Large task, cycle time = 14 days, 1.5x = 21 days
    // Due in 10 days, 0% complete, created 50 days ago → very behind
    const now = new Date("2026-02-20");
    const task = makeTask({
      effortEstimate: "large",
      dueDate: new Date("2026-03-02"), // 10 days runway
      percentComplete: 0,
      createdAt: new Date("2026-01-01"),
    });

    expect(isBehindSchedule(task, now, cycleTimes)).toBe(true);
  });
});
