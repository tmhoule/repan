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

  it("uses fallback defaults when fewer than 3 completions for a size", async () => {
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
