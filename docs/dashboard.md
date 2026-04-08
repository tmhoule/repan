# Dashboard

The dashboard is the manager's primary view for understanding team health at a glance. Access it from the **Dashboard** link in the navigation (manager-only).

## Team Summary Strip

A row of key metrics across the top:

| Metric | What it shows |
|--------|---------------|
| **In Progress** | Total tasks currently being worked on across the team |
| **At Risk** | Count of tasks that are blocked, overdue, stale, or behind schedule |
| **pts/wk avg** | Average throughput in effort points per week (8-week rolling) |
| **Backlog** | Current backlog size with trend indicator (growing/shrinking/stable) |

WIP count highlights amber when it exceeds 3x the team size (a signal of excessive context-switching).

## Staff Workload Chart

A horizontal stacked bar chart with one row per team member. Each bar shows:

- **Purple segment** — Boulder allocation (ongoing commitments)
- **Red segment** — High-priority task load
- **Orange segment** — Medium-priority task load
- **Green segment** — Low-priority task load
- **Thin line below** — 30-day rolling average for trend comparison

The percentage is calculated using configurable priority weights (default: high=60%, medium=35%, low=10%). A vertical white line marks the 100% capacity threshold. Bars extending past it appear in red.

**Hover** over any bar to see:
- Individual task titles grouped by priority
- Boulder details with time allocations
- WIP count (highlighted amber if 5+)
- 30-day average comparison

The 30-day average uses daily workload snapshots for accuracy. For the first week after deployment, it falls back to a current-state approximation.

## Backlog Health

Shows the state of the unassigned work queue:
- **Total items** and **total effort points**
- **Estimated weeks to clear** at current throughput
- **Trend** — growing, shrinking, or stable

A growing backlog over multiple weeks indicates either too much work coming in or not enough capacity to clear it.

## Key Projects

High-priority tasks with their tracking status:

| Status | Meaning |
|--------|---------|
| **On Track** | No risk flags detected |
| **Behind** | Behind schedule or overdue |
| **At Risk** | Stale (no activity) |
| **Blocked** | Currently blocked |

Each project shows assignee, due date, and progress percentage.

## At-Risk Tasks

A prioritized list of tasks needing attention, sorted by severity:

1. **Blocked** — Waiting on something (highest severity)
2. **Overdue** — Past due date
3. **Behind Schedule** — Progress significantly below expected pace
4. **Stale** — No activity for 3+ days (in-progress) or 5+ days (not started with due date)
5. **Unassigned & Due Soon** — Backlog items with due dates within 7 days

Each task shows its risk flags, assignee, due date, and progress. Click to navigate to the task detail page.

## Throughput Chart

An 8-week line chart showing effort points completed per week. A dashed reference line shows the rolling average. This is the team's velocity trend — consistent throughput indicates predictable delivery.

## Recent Achievements

Shows badges earned by team members in the last 7 days. Only appears when there are recent achievements.

## Activity Feed

The last 50 team activities: status changes, comments, assignments, and completions. Each entry shows who did what, on which task, and when.
