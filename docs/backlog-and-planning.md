# Backlog and Planning

## The Backlog

The backlog is the queue of unassigned tasks waiting to be picked up. It appears at the bottom of the tasks page and is visible to all team members.

Tasks enter the backlog when:
- Created without an assignee
- A team member moves a task to backlog via the Flag menu
- A deactivated user's tasks are returned to backlog (boulders are archived instead)

### Backlog Health

The backlog section shows health metrics at a glance:

- **Total Items** — Number of unassigned tasks
- **Total Effort** — Sum of effort points (small=1, medium=3, large=5)
- **Estimated Weeks** — How long it would take to clear the backlog at current throughput
- **Trend** — Whether the backlog is growing, shrinking, or stable compared to last week

### Claiming Tasks

Any team member can claim a task from the backlog by clicking the **Claim** button. This:
- Assigns the task to you
- Removes it from the backlog
- Awards 3 points
- Logs an assignment activity

Claiming is atomic — if two people click Claim on the same task simultaneously, only one succeeds.

### Backlog Ordering

Tasks in the backlog are sorted by urgency, which combines:
- **Priority weight** — High-priority tasks float to the top
- **Due date proximity** — Tasks with approaching deadlines rank higher
- **Effort modifier** — Larger tasks with upcoming deadlines get a bump (they need more lead time)
- **Age** — Tasks without due dates get a gradual urgency boost over time (+1 per week, up to +10)

## Buckets

Buckets are manager-defined categories for organizing tasks. Examples: "Infrastructure", "Customer Requests", "Technical Debt".

### Managing Buckets

Managers create and manage buckets from the Admin panel or the backlog filter bar:
- Each bucket has a **name** and **color**
- Buckets are team-scoped
- Tasks can be assigned to one bucket (or left uncategorized)

### Filtering by Bucket

The backlog shows a filter bar when buckets exist. Click a bucket to filter, or click "Uncategorized" to see tasks without a bucket. The filter also appears on the History page.

## Forecasting

The backlog includes a simple forecast for each item: **estimated weeks until someone starts working on it**.

This is calculated by:
1. Taking the team's weekly throughput (effort points completed per week, averaged over 4 weeks)
2. Walking through the backlog in position order
3. Accumulating effort points until the throughput budget for each week is exhausted
4. Reporting which week each task would be reached

The forecast updates as throughput changes and as tasks are claimed or completed.

## Triage

Tasks have a **triaged** flag. Assigning a bucket to a task automatically marks it as triaged. This helps managers track which backlog items have been reviewed and categorized versus newly created items that haven't been looked at yet.
