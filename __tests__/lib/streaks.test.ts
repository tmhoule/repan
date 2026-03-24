import { shouldIncrementStreak, shouldResetStreak, isStreakMilestone } from "@/lib/streaks";

describe("daily check-in", () => {
  it("increments yesterday->today", () => { expect(shouldIncrementStreak("daily_checkin", new Date("2026-03-22"), new Date("2026-03-23"))).toBe(true); });
  it("no increment same day", () => { expect(shouldIncrementStreak("daily_checkin", new Date("2026-03-23T10:00:00"), new Date("2026-03-23T15:00:00"))).toBe(false); });
  it("resets on gap >1", () => { expect(shouldResetStreak("daily_checkin", new Date("2026-03-20"), new Date("2026-03-23"))).toBe(true); });
  it("no reset yesterday", () => { expect(shouldResetStreak("daily_checkin", new Date("2026-03-22"), new Date("2026-03-23"))).toBe(false); });
});
describe("weekly momentum", () => {
  it("increments prev week", () => { expect(shouldIncrementStreak("weekly_momentum", new Date("2026-03-16"), new Date("2026-03-23"))).toBe(true); });
  it("resets >1 week", () => { expect(shouldResetStreak("weekly_momentum", new Date("2026-03-09"), new Date("2026-03-23"))).toBe(true); });
});
describe("milestones", () => {
  it("recognizes", () => { [3,5,10,30].forEach(n => expect(isStreakMilestone(n)).toBe(true)); });
  it("rejects", () => { [1,7,15].forEach(n => expect(isStreakMilestone(n)).toBe(false)); });
});
