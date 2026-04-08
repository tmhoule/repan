# Tasks and Workflows

## Task Types

### Standard Tasks

The core work item. Each task has:

- **Title** (required) and optional **Description**
- **Priority** — High, Medium, or Low
- **Effort Estimate** — Small, Medium, or Large (used for forecasting and points)
- **Due Date** — Optional deadline
- **Progress** — 0-100% slider updated as work progresses
- **Assignment** — Who's responsible (or unassigned for backlog)
- **Bucket** — Optional category for organizing work

### Boulders

Ongoing operational commitments with no end date. Examples: on-call rotation, code review duty, customer escalation handling.

Boulders are different from tasks:
- Tracked by **time allocation** (0-100% of a person's time) instead of progress percentage
- No due date
- Appear in a dedicated "Boulders" section on the tasks page
- Factor into workload and capacity calculations

To create a boulder, click **Create Boulder** on the tasks page.

### Todos

Personal quick reminders with no tracking, no priority, and no due date. They appear in a collapsible "To Do" section on your tasks page. Completing a todo awards 1 point.

## Task Statuses

| Status | Meaning | Visual |
|--------|---------|--------|
| **Not Started** | Created but no work has begun | Gray |
| **In Progress** | Actively being worked on | Blue |
| **Blocked** | Cannot proceed — requires a blocker reason | Red |
| **Stalled** | No progress updates recently | Orange |
| **Paused** | Intentionally put on hold | Yellow |
| **Done** | Completed | Green |
| **Boulder** | Ongoing commitment (special type) | Purple |

## Task Lifecycle

```
Created (Not Started)
    |
    v
In Progress  <-->  Blocked / Stalled / Paused
    |
    v
   Done
```

Key transitions:
- Moving to **In Progress** records `startedAt` (used for cycle time)
- Moving to **Blocked** requires a blocker reason and notifies the assignee
- Resolving a **Blocked** task notifies the assignee and awards points
- Moving to **Done** sets `completedAt`, awards points based on effort, and checks on-time streaks
- Completed tasks can be **reopened** from the History page

## The Tasks Page Layout

Your tasks page shows sections in this order:

1. **Active Tasks** — Your in-progress and not-started tasks
2. **To Dos** — Personal reminders (collapsible)
3. **Stalled / Blocked / Paused** — Tasks needing attention
4. **Boulders** — Ongoing commitments with time allocation
5. **Completed** — Done tasks (collapsed by default)
6. **Backlog** — Unassigned tasks available to claim

## Task Cards

Each task card shows:
- Title (links to detail page)
- Status and priority badges
- Staleness indicator (days since last activity)
- Progress slider (drag to update)
- Due date with color coding (red = overdue, amber = due soon)
- Quick actions: **Flag** (change status), **Comment** (inline), **Done** (complete)

### Flag Menu

The Flag dropdown lets you quickly change a task's status:
- Mark Blocked
- Mark Stalled
- Mark Paused
- Mark In Progress
- Reset to Not Started (only for unclaimed tasks)
- Move to Backlog
- Delete Task (if you created it, are assigned, or are a manager)

## Creating Tasks

Click **Create Task** from the tasks page. Fill in:

1. **Title** (required)
2. **Description** — Context, acceptance criteria, etc.
3. **Bucket** — Category (if your team uses buckets)
4. **Priority** — High, Medium, or Low
5. **Effort Estimate** — Small, Medium, or Large
6. **Due Date** — When it needs to be done

Tasks are assigned to you by default. Managers can reassign to other team members.

## Editing Tasks

Click any task title to open the detail page. Changes auto-save with an 800ms debounce — no save button needed. The detail page also shows:
- Full activity log (status changes, comments, assignments)
- Comment box for discussion
- All editable fields

## Comments

Add comments from the task detail page or inline on task cards (the small text field next to Flag/Done). Comments are logged in the activity timeline and award 1 point (max 5 per day).
