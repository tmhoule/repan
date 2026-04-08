# Reports

The reports page provides weekly and monthly performance metrics. Access it from the **Reports** link in the navigation (manager-only). Reports can be printed or exported as PDF using the Print button.

## Period Selection

Toggle between **Weekly** (last 7 days) and **Monthly** (last 30 days) using the tabs at the top. Both views show the same set of cards with data scoped to the selected period. Throughput history always shows 8 weeks regardless of period selection.

## Summary Cards

A row of key metrics with period-over-period comparison:

| Card | What it measures | Comparison |
|------|-----------------|------------|
| **Completed** | Tasks finished this period | vs previous period |
| **Created** | New tasks added | vs previous period |
| **Backlog Size** | Current unassigned items | — |
| **Backlog Delta** | Change in backlog size since period start | Color: green (shrinking), red (growing) |
| **Missed Deadlines** | Tasks completed after their due date | vs previous period |

Additional cards appear conditionally:
- **Stale Tasks** — Count of tasks with no activity in 3+ days (only if > 0)
- **Behind Schedule** — Tasks where progress is significantly below expected pace (only if > 0)
- **Boulders** — Active boulder count and total time allocation percentage (only if boulders exist)

## Throughput Trend

A line chart showing effort points completed per week over the last 8 weeks. A dashed reference line shows the rolling average.

Effort points: small = 1, medium = 3, large = 5.

Consistent throughput indicates predictable delivery. A downward trend may signal blockers, context-switching, or capacity issues.

## Cycle Time

Average days from **started** (first moved to in-progress) to **completed**, broken down by effort size:

| Effort | Expected |
|--------|----------|
| Small | Baseline (shortest) |
| Medium | ~3x small |
| Large | ~5x small |

Each row shows a horizontal bar proportional to the average, the day count, and the number of tasks in the sample. This helps the team understand how long work actually takes by size.

## Estimation Accuracy

Compares actual cycle time ratios to expected ratios:

- If medium tasks take 3x as long as small tasks, estimates are well-calibrated
- If large tasks take 10x instead of the expected 5x, the team is consistently underestimating large work

The table shows: effort size, average days, actual ratio to small, and expected ratio. A note appears when enough data exists (3+ small tasks) to make the comparison meaningful.

## Blocker Analysis

Metrics about blocked work during the period:

- **Blockers Resolved** — How many blocking periods were resolved
- **Avg Resolution Time** — Average days a task stays blocked
- **Longest Blocker** — Maximum days blocked (amber highlight)
- **Currently Blocked** — Tasks blocked right now (red highlight)

High blocker counts or long resolution times indicate cross-team dependency problems or organizational friction.

## Bucket Distribution

A bar chart showing task counts by bucket/category, sorted by count. Shows what types of work the team is spending time on. Uncategorized tasks are shown separately.

## Backlog Age

How long items have been sitting in the backlog unassigned:

- **Avg time in backlog** — Mean age across all backlog items
- **Oldest item** — Maximum age (red if > 30 days, amber if > 14 days)
- **Older than 7 days** — Count (amber)
- **Older than 30 days** — Count (red)

A growing number of old backlog items suggests the team is accumulating work it never intends to do. Consider archiving or triaging aged items.

## Contribution by Person

A table showing each team member's output for the period:

| Column | What it shows |
|--------|---------------|
| **Name** | Team member with rank number |
| **Tasks Completed** | Count of tasks finished |
| **WIP** | Currently in-progress tasks (amber if 5+) |
| **Points Earned** | Gamification points for the period |
| **Boulder %** | Ongoing commitment allocation |
| **Velocity (8w)** | Sparkline showing weekly completion trend |

This table is only visible to managers. Staff see a message indicating it's a manager-only view.

Credit goes to the **assignee** of the task, not whoever clicked Done. If a manager completes someone else's task, the assignee still gets credit.
