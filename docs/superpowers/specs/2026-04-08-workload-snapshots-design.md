# Workload Snapshots

## Problem

The dashboard 30-day rolling workload average applies each task's current status to all 30 historical days. A task blocked today gets the blocked multiplier retroactively applied to the entire window, producing inaccurate workload metrics. As reports grow in importance, this inaccuracy compounds — capacity forecasting, trend charts, and health metrics all need trustworthy historical data.

## Solution

Capture a daily snapshot of each user's workload into a `WorkloadSnapshot` table. The dashboard reads from snapshots instead of computing on the fly. The cron job that already runs daily adds a snapshot step.

## Data Model

### WorkloadSnapshot

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| id | String (UUID) | auto | Primary key |
| userId | String | — | FK to User |
| teamId | String | — | FK to Team |
| date | DateTime | — | Snapshot date (midnight UTC, no time component) |
| workloadScore | Int | — | Computed weighted score using team priority weights and status multipliers |
| taskCount | Int | — | Active non-boulder, non-done task count |
| boulderAllocation | Int | — | Sum of boulder timeAllocation percentages |
| blockedCount | Int | — | Tasks in blocked, stalled, or paused status |
| highCount | Int | — | High-priority active tasks |
| mediumCount | Int | — | Medium-priority active tasks |
| lowCount | Int | — | Low-priority active tasks |

**Constraints:**
- `@@unique([userId, teamId, date])` — prevents duplicate snapshots if the cron runs twice
- `@@index([teamId, date])` — efficient team-wide queries for reports

**Column mapping:** All fields use snake_case in the database (e.g., `workload_score`, `task_count`, `boulder_allocation`).

**Table name:** `workload_snapshots`

## Snapshot Computation

The snapshot uses the same formula the dashboard uses today:

1. For each active team member, query their non-archived tasks assigned to them
2. For each non-boulder, non-done task:
   - Start with the priority weight (`team.weightHigh`, `team.weightMedium`, or `team.weightLow`)
   - Apply status multiplier: blocked gets `team.multiplierBlocked / 100`, stalled/paused gets `team.multiplierStalled / 100`
   - Sum the weighted values into `workloadScore`
3. Boulder tasks: sum `timeAllocation` into `boulderAllocation`
4. Count tasks by priority and blocked status for the component fields
5. Upsert the row (using the unique constraint) so re-runs are idempotent

## Cron Integration

Add a new step to `POST /api/cron` after the existing steps (archive, purge, notifications, digest):

```
// 6. Daily workload snapshots
```

For each team:
1. Fetch the team's priority weights and status multipliers
2. Fetch active team members
3. Fetch all non-archived tasks assigned to those members
4. Compute and upsert one `WorkloadSnapshot` per user per team

Use `prisma.workloadSnapshot.upsert()` with the unique constraint as the where clause.

**Return value:** Add `snapshotsRecorded` to the cron results object.

## Dashboard Integration

### Replacing the 30-day average

Replace the current 30-day loop in `GET /api/dashboard` with:

```sql
SELECT AVG(workload_score) as avg30d
FROM workload_snapshots
WHERE user_id = ? AND team_id = ? AND date >= (now - 30 days)
```

In Prisma:
```typescript
const snapshots = await prisma.workloadSnapshot.aggregate({
  where: { userId: u.id, teamId, date: { gte: thirtyDaysAgo } },
  _avg: { workloadScore: true },
});
const avg30d = Math.round(snapshots._avg.workloadScore ?? 0);
```

### Fallback for fresh deploys

If fewer than 7 days of snapshots exist for a user, fall back to the current in-memory calculation. This ensures the dashboard works immediately after deploy without waiting 30 days for data. The fallback can be removed after the system has been running for a month.

Check: `prisma.workloadSnapshot.count({ where: { userId, teamId, date: { gte: thirtyDaysAgo } } })`. If count < 7, use the existing calculation.

## Future Report Capabilities

This data enables:

- **Workload trend charts:** Query snapshots grouped by date for a line chart per user or team aggregate. The component fields (highCount, blockedCount, boulderAllocation) allow stacked area charts showing workload composition over time.

- **Capacity forecasting:** Compare a user's recent 7-day average to their 30-day baseline. If recent load is significantly below baseline, they have capacity. If above, they're overloaded.

- **Team health metrics:** Flag users whose average workloadScore exceeds a configurable threshold over rolling 2-week windows. Identify consistently underutilized members. Detect workload imbalances across the team.

## What's Excluded

- **No backfill.** The current metric is already approximate. Snapshots start accumulating from deploy day forward. No retroactive data reconstruction.

- **No per-task breakdown.** The snapshot stores aggregate counts by priority and status, not individual task references. This keeps the table lean (one row per user per team per day) while providing enough granularity for all planned report types.

- **No separate snapshot service.** The computation is a function in `src/lib/` called from the cron route. No new API endpoints for writing snapshots.

- **No UI changes in this spec.** The dashboard consumes snapshots transparently. Future report UI for trend charts and capacity forecasting will be separate specs.

## Files Changed

| File | Change |
|------|--------|
| `src/prisma/schema.prisma` | Add `WorkloadSnapshot` model |
| `src/prisma/migrations/YYYYMMDD_add_workload_snapshots/migration.sql` | Create table, unique constraint, index |
| `src/lib/workload-snapshot.ts` | New file: `recordDailySnapshots(teamId)` function |
| `src/app/api/cron/route.ts` | Add snapshot step after existing steps |
| `src/app/api/dashboard/route.ts` | Replace 30-day loop with snapshot query + fallback |
