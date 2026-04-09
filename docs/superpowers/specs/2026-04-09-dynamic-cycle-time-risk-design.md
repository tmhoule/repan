# Dynamic Cycle Time in Risk Detection

## Problem

`isBehindSchedule()` assumes linear progress from `createdAt` to `dueDate`, producing false positives for tasks with distant due dates and small effort. A "small" task due in 2 months gets flagged as behind schedule when it's barely started, even though the team historically completes small tasks in a few days.

## Solution

Compute team-average cycle times per effort size from historical completions, then use those durations to add a "should work be happening yet?" check before applying the existing linear progress comparison.

## Design

### New function: `getTeamCycleTimes(teamId: string)`

Location: `src/lib/risk-detection.ts`

- Queries completed tasks (with both `startedAt` and `completedAt`) for the team
- Groups by `effortEstimate`, computes average days to complete per size
- Returns `{ small: number, medium: number, large: number }` (in days)
- Falls back to hardcoded defaults if fewer than 3 completions exist for a given size:
  - small: 3 days
  - medium: 7 days
  - large: 14 days

### Updated `isBehindSchedule()`

Add a cycle-time grace check before the existing linear progress logic:

1. Look up `expectedDuration` = team average cycle time for this task's effort size
2. Compute `runway` = dueDate - now (in days)
3. If `runway > expectedDuration * 1.5` → return `false` (plenty of time, not at risk)
4. Otherwise, fall through to the existing linear progress check (percentComplete vs expected progress)

The 1.5x multiplier provides buffer so tasks aren't flagged until the remaining runway is within 150% of the typical duration for that effort size.

### Wiring

- `getRiskFlags()` accepts cycle time data as a parameter so callers can compute it once per request
- Dashboard API (`/api/dashboard`): calls `getTeamCycleTimes()` once, passes to `getRiskFlags()` for each task
- Reports API (`/api/reports`): same pattern — compute once, pass through

### What doesn't change

- No new UI components — the existing Cycle Time card in reports already displays the averages
- No per-person scoping — uses team-wide averages only
- Tasks without a due date are still skipped (no behind-schedule risk)
- The existing linear progress check remains as the final arbiter once a task is within the runway window

## Scope

- `src/lib/risk-detection.ts` — add `getTeamCycleTimes()`, update `isBehindSchedule()` and `getRiskFlags()` signatures
- `src/app/api/dashboard/route.ts` — call `getTeamCycleTimes()`, pass to risk detection
- `src/app/api/reports/route.ts` — same wiring
