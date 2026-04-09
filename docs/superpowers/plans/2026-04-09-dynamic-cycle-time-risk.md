# Dynamic Cycle Time in Risk Detection — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Use team-average historical cycle times per effort size to prevent false "behind schedule" flags on tasks with plenty of runway.

**Architecture:** Add `getTeamCycleTimes()` to `risk-detection.ts` that queries completed tasks grouped by effort size. Thread the result through `getRiskFlags()` → `isBehindSchedule()` so both dashboard and reports APIs benefit. No new UI — just smarter risk detection.

**Tech Stack:** Prisma, TypeScript, Jest

---

### Task 1: Add `getTeamCycleTimes()` function

**Files:**
- Modify: `src/lib/risk-detection.ts`
- Create: `src/__tests__/risk-detection.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/risk-detection.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/__tests__/risk-detection.test.ts --no-coverage 2>&1 | tail -20`
Expected: FAIL — `getTeamCycleTimes` is not exported / does not exist.

- [ ] **Step 3: Add the `CycleTimes` type and `getTeamCycleTimes()` function**

In `src/lib/risk-detection.ts`, add after the existing imports and types:

```typescript
export interface CycleTimes {
  small: number;
  medium: number;
  large: number;
}

const DEFAULT_CYCLE_TIMES: CycleTimes = { small: 3, medium: 7, large: 14 };
const MIN_SAMPLE_SIZE = 3;

/**
 * Compute team-average cycle times (in days) per effort size from completed tasks.
 * Falls back to defaults when fewer than MIN_SAMPLE_SIZE completions exist for a size.
 */
export async function getTeamCycleTimes(teamId: string): Promise<CycleTimes> {
  const completed = await prisma.task.findMany({
    where: { teamId, status: "done", startedAt: { not: null }, completedAt: { not: null } },
    select: { effortEstimate: true, startedAt: true, completedAt: true },
  });

  const totals: Record<string, { sum: number; count: number }> = {
    small: { sum: 0, count: 0 },
    medium: { sum: 0, count: 0 },
    large: { sum: 0, count: 0 },
  };

  for (const t of completed) {
    const days = (t.completedAt!.getTime() - t.startedAt!.getTime()) / 86400000;
    if (totals[t.effortEstimate]) {
      totals[t.effortEstimate].sum += days;
      totals[t.effortEstimate].count++;
    }
  }

  return {
    small: totals.small.count >= MIN_SAMPLE_SIZE ? Math.round(totals.small.sum / totals.small.count) : DEFAULT_CYCLE_TIMES.small,
    medium: totals.medium.count >= MIN_SAMPLE_SIZE ? Math.round(totals.medium.sum / totals.medium.count) : DEFAULT_CYCLE_TIMES.medium,
    large: totals.large.count >= MIN_SAMPLE_SIZE ? Math.round(totals.large.sum / totals.large.count) : DEFAULT_CYCLE_TIMES.large,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/__tests__/risk-detection.test.ts --no-coverage 2>&1 | tail -20`
Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/risk-detection.ts src/__tests__/risk-detection.test.ts
git commit -m "feat: add getTeamCycleTimes for dynamic cycle time lookup"
```

---

### Task 2: Update `isBehindSchedule()` with cycle-time grace check

**Files:**
- Modify: `src/lib/risk-detection.ts`
- Modify: `src/__tests__/risk-detection.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/risk-detection.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/__tests__/risk-detection.test.ts --no-coverage 2>&1 | tail -20`
Expected: FAIL — `isBehindSchedule` doesn't accept a `cycleTimes` parameter.

- [ ] **Step 3: Update `isBehindSchedule()` to accept and use cycle times**

Replace the existing `isBehindSchedule` function in `src/lib/risk-detection.ts`:

```typescript
/**
 * Detect if a task is behind schedule based on expected vs actual progress.
 * Uses team cycle times to skip tasks with plenty of runway relative to their effort.
 */
export function isBehindSchedule(task: TaskForRisk & { effortEstimate: string }, now: Date, cycleTimes?: CycleTimes): boolean {
  if (!task.dueDate || task.status === "done" || task.status === "boulder") return false;
  if (!task.assignedToId) return false;

  // Cycle-time grace check: if plenty of runway remains, not behind
  if (cycleTimes) {
    const runway = (task.dueDate.getTime() - now.getTime()) / 86400000;
    const expectedDuration = cycleTimes[task.effortEstimate as keyof CycleTimes] ?? 7;
    if (runway > expectedDuration * 1.5) return false;
  }

  const totalDuration = task.dueDate.getTime() - task.createdAt.getTime();
  if (totalDuration <= 0) return false;

  const elapsed = now.getTime() - task.createdAt.getTime();
  const expectedProgress = Math.min(100, (elapsed / totalDuration) * 100);

  return task.percentComplete < expectedProgress - 25;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/__tests__/risk-detection.test.ts --no-coverage 2>&1 | tail -20`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/risk-detection.ts src/__tests__/risk-detection.test.ts
git commit -m "feat: add cycle-time grace check to isBehindSchedule"
```

---

### Task 3: Thread cycle times through `getRiskFlags()`

**Files:**
- Modify: `src/lib/risk-detection.ts`
- Modify: `src/__tests__/risk-detection.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `src/__tests__/risk-detection.test.ts`:

```typescript
describe("getRiskFlags with cycle times", () => {
  const cycleTimes: CycleTimes = { small: 3, medium: 7, large: 14 };

  it("does not flag behind_schedule when runway exceeds cycle time threshold", () => {
    const now = new Date("2026-01-15");
    const task = {
      id: "t1",
      status: "in_progress",
      percentComplete: 0,
      dueDate: new Date("2026-03-15"), // 59 days runway
      createdAt: new Date("2026-01-01"),
      assignedToId: "u1",
      effortEstimate: "small",
    };

    const flags = getRiskFlags(task, now, now, cycleTimes);
    const riskTypes = flags.map((f) => f.riskType);

    expect(riskTypes).not.toContain("behind_schedule");
  });

  it("still flags behind_schedule when runway is tight", () => {
    const now = new Date("2026-01-13");
    const task = {
      id: "t1",
      status: "in_progress",
      percentComplete: 0,
      dueDate: new Date("2026-01-15"), // 2 days runway
      createdAt: new Date("2026-01-01"),
      assignedToId: "u1",
      effortEstimate: "small",
    };

    const flags = getRiskFlags(task, now, now, cycleTimes);
    const riskTypes = flags.map((f) => f.riskType);

    expect(riskTypes).toContain("behind_schedule");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/__tests__/risk-detection.test.ts --no-coverage 2>&1 | tail -20`
Expected: FAIL — `getRiskFlags` doesn't accept `cycleTimes` parameter.

- [ ] **Step 3: Update `getRiskFlags()` signature and pass cycle times through**

Update `TaskForRisk` to include `effortEstimate`, then update `getRiskFlags`:

In `src/lib/risk-detection.ts`, update the `TaskForRisk` interface:

```typescript
interface TaskForRisk {
  id: string;
  status: string;
  percentComplete: number;
  dueDate: Date | null;
  createdAt: Date;
  assignedToId: string | null;
  effortEstimate: string;
}
```

Then update `getRiskFlags`:

```typescript
/**
 * Compute all risk flags for a task.
 */
export function getRiskFlags(task: TaskForRisk, lastActivity: Date | undefined, now: Date, cycleTimes?: CycleTimes): RiskFlag[] {
  const flags: RiskFlag[] = [];

  if (task.status === "blocked") {
    flags.push({ riskType: "blocked", label: "Blocked" });
  }
  if (task.status === "stalled") {
    flags.push({ riskType: "stalled", label: "Stalled" });
  }
  if (task.dueDate && task.dueDate < now) {
    flags.push({ riskType: "overdue", label: "Overdue" });
  }
  if (!task.assignedToId && task.dueDate) {
    const daysUntilDue = Math.ceil((task.dueDate.getTime() - now.getTime()) / 86400000);
    if (daysUntilDue <= 7) {
      flags.push({ riskType: "unassigned_approaching", label: "Unassigned & due soon" });
    }
  }
  if (isBehindSchedule(task, now, cycleTimes)) {
    flags.push({ riskType: "behind_schedule", label: "Behind schedule" });
  }
  if (isStale(task, lastActivity, now)) {
    const days = getDaysSinceActivity(task, lastActivity, now);
    flags.push({ riskType: "stale", label: `No activity ${days}d` });
  }

  return flags;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/__tests__/risk-detection.test.ts --no-coverage 2>&1 | tail -20`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/risk-detection.ts src/__tests__/risk-detection.test.ts
git commit -m "feat: thread cycle times through getRiskFlags"
```

---

### Task 4: Wire cycle times into dashboard API

**Files:**
- Modify: `src/app/api/dashboard/route.ts`

- [ ] **Step 1: Update the import**

In `src/app/api/dashboard/route.ts`, update line 6:

```typescript
import { getLastActivityMap, getRiskFlags, getTeamCycleTimes } from "@/lib/risk-detection";
```

- [ ] **Step 2: Fetch cycle times and pass to `getRiskFlags` calls**

After the `lastActivityMap` line (line 91), add:

```typescript
const cycleTimes = await getTeamCycleTimes(teamId);
```

Then update the two `getRiskFlags` calls.

First, the at-risk list (around line 95):

```typescript
const flags = getRiskFlags(t, lastActivityMap.get(t.id), now, cycleTimes);
```

Second, the key projects section (around line 126):

```typescript
const flags = getRiskFlags(t, lastActivityMap.get(t.id), now, cycleTimes);
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx next build --no-lint 2>&1 | tail -20`
Expected: Build succeeds (or at minimum, no type errors in the modified files).

If a full build is too slow, run: `npx tsc --noEmit 2>&1 | tail -30`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/route.ts
git commit -m "feat: wire cycle times into dashboard risk detection"
```

---

### Task 5: Wire cycle times into reports API

**Files:**
- Modify: `src/app/api/reports/route.ts`

- [ ] **Step 1: Update the import**

In `src/app/api/reports/route.ts`, update line 5:

```typescript
import { getLastActivityMap, isStale, isBehindSchedule, getTeamCycleTimes } from "@/lib/risk-detection";
```

- [ ] **Step 2: Fetch cycle times and pass to `isBehindSchedule` call**

After the `activityMap` line (line 45), add:

```typescript
const cycleTimes = await getTeamCycleTimes(teamId);
```

Then update the `isBehindSchedule` call in the loop (around line 51):

```typescript
if (isBehindSchedule(t, now, cycleTimes)) behindScheduleTasks++;
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx tsc --noEmit 2>&1 | tail -30`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/reports/route.ts
git commit -m "feat: wire cycle times into reports risk detection"
```

---

### Task 6: Verify end-to-end

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx jest --no-coverage 2>&1 | tail -20`
Expected: All tests pass.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | tail -30`
Expected: No errors.

- [ ] **Step 3: Manual smoke test**

Start the dev server and verify:
1. Dashboard loads without errors
2. Reports page loads without errors
3. At-risk tasks list shows fewer false positives for distant-deadline small tasks

Run: `npx next dev`
Then check browser at localhost:3000/dashboard and localhost:3000/reports.
