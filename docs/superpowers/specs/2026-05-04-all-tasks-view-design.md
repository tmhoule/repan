# All Tasks View

## Problem

There is no team-wide list of in-flight work. `/tasks` (My Tasks) shows only the viewer's assignments plus the backlog. `/team/[id]` shows tasks for one teammate. `/history` shows only completed work. To answer "what is the team currently working on?" you have to hop between pages.

## Solution

Add an `/all-tasks` page: a sortable, filterable table of every active task in the user's current team, with inline status changes via a popup. Linked from a new "All Tasks" entry in the staff nav, between Team and History.

## Scope

- **Included:** every `Task` in the active team that is not archived and whose status is one of `not_started`, `in_progress`, `blocked`, `stalled`, `paused`. Backlog (unassigned) tasks are included; their owner column reads "Unassigned".
- **Excluded:**
  - `done` tasks — they live on `/history`
  - `boulder` tasks — they're tracked separately on `/tasks`
  - `Todo` records — separate model, naturally absent
  - archived tasks (`archivedAt` not null)

## Navigation

Insert into `staffNavLinks` in `src/components/layout/header.tsx`, between `/team` and `/history`:

```
My Tasks → Team → All Tasks → History → Standup
```

The mobile `allLinks` array is derived from `staffNavLinks`, so no separate change is needed for mobile.

## Page: `/all-tasks`

Client component at `src/app/all-tasks/page.tsx`. Uses `useSWR` against `/api/tasks/all?<params>`. Title "All Tasks", subtitle showing the live row count for the active team.

### Filter bar (top)

Mirrors the `/history` filter bar pattern.

| Filter | Control | Values |
|---|---|---|
| Status | multi-select chips | Not Started, In Progress, Blocked, Stalled, Paused (default: all selected = no filter sent) |
| Person | `<select>` | "All", "Unassigned", every team member |
| Bucket | `<select>` | "All", "Uncategorized", every bucket (from `/api/buckets`) |

### Table

Compact rows with a sticky header. Columns:

| Column | Sortable | Notes |
|---|---|---|
| Title | yes | Link to `/tasks/[id]` |
| Owner | yes | Avatar + name; muted "Unassigned" when null |
| Due | yes | Formatted via the same logic as `TaskCard.formatDueDate` (overdue = red, ≤2 days = amber). Empty when null. |
| Priority | yes | `<PriorityBadge>` (high → medium → low when asc) |
| Status | no | `<StatusBadge>` wrapped in `DropdownMenu` — click opens the popup |
| Bucket | no | `<BucketBadge>` |

Sort UX: column header buttons toggle `asc`/`desc` and update the SWR key. The active sort column shows a small arrow icon.

**Default sort:** `dueDate asc` (overdue/upcoming first, nulls last).

### Status popup

Clicking the status badge opens a `DropdownMenu` with these options:

- Not Started
- In Progress
- Blocked
- Stalled
- Paused
- Done

`boulder` is intentionally not offered — converting a regular task to a boulder is an unusual operation and is not exposed elsewhere in the UI.

On select: call `PATCH /api/tasks/[id]` with `{ status }`, then SWR `mutate("/api/tasks/all?...")`. Marking a task `done` is allowed; the row disappears from the view on revalidation since `done` is excluded by the where clause. If the API returns 403, show a `sonner` toast: "You don't have permission to change this task." The existing `canEditTask` check on the server is the source of truth — the UI does not pre-gate the popup.

### Empty / loading states

- **Loading:** five animated `h-12` skeleton rows.
- **Empty (no rows match filters):** dashed-border block with `<ClipboardList>` icon and "No tasks match your filters." Matches the existing pattern on `/tasks` and `/history`.

## API: `GET /api/tasks/all`

New file: `src/app/api/tasks/all/route.ts`.

### Auth

`requireSession()` + `requireTeam()`. Any team member of the active team can call.

### Query params

| Param | Type | Notes |
|---|---|---|
| `status` | repeatable string | One or more of `not_started`, `in_progress`, `blocked`, `stalled`, `paused`. Omitted = all five. |
| `assignedTo` | string | A user id, or the literal `unassigned` for null assignees. Omitted = no filter. |
| `bucketId` | string | A bucket id, or the literal `uncategorized` for null bucket. Omitted = no filter. |
| `sort` | string | One of `dueDate`, `priority`, `owner`, `title`. Default `dueDate`. |
| `dir` | string | `asc` or `desc`. Default `asc`. |

### Where clause

```ts
{
  teamId: <activeTeam>,
  archivedAt: null,
  status: { in: requestedStatuses ?? ["not_started","in_progress","blocked","stalled","paused"] },
  // never include "done" or "boulder" — even if a client passes them, intersect with the allowed set
  ...(assignedTo === "unassigned" ? { assignedToId: null }
       : assignedTo ? { assignedToId: assignedTo } : {}),
  ...(bucketId === "uncategorized" ? { bucketId: null }
       : bucketId ? { bucketId } : {}),
}
```

### Response shape

```ts
{
  tasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    priority: "high" | "medium" | "low";
    effortEstimate: "small" | "medium" | "large";
    percentComplete: number;
    dueDate: string | null;
    updatedAt: string;
    assignedTo: { id: string; name: string; avatarColor: string } | null;
    bucket: { id: string; name: string; colorKey: string } | null;
  }>;
}
```

### Sorting

The route sorts in memory after the Prisma fetch. This view has no pagination and team task counts are bounded, so the simplicity is worth more than the marginal DB efficiency.

| `sort` | `asc` | `desc` |
|---|---|---|
| `dueDate` | nulls last, ascending date | nulls first, descending date |
| `priority` | high → medium → low | low → medium → high |
| `owner` | assignedTo.name A→Z, nulls grouped at end | reversed; nulls still at end |
| `title` | A→Z | Z→A |

## Permissions

- **Read** — any team member of the active team. Cross-team access returns 403 (server enforces via `requireTeam` plus the `teamId` filter).
- **Write (status change)** — handled by the existing `PATCH /api/tasks/[id]`, which already enforces `canEditTask`. No new auth code.

## Files

### New
- `src/app/all-tasks/page.tsx`
- `src/app/api/tasks/all/route.ts`
- `src/lib/all-tasks-query.ts` — pure helpers for parameter parsing and sorting (so they can be unit-tested without spinning up the route)
- `__tests__/lib/all-tasks-query.test.ts` — unit tests, matching the existing `__tests__/lib/*.test.ts` convention

### Modified
- `src/components/layout/header.tsx` — insert `{ href: "/all-tasks", label: "All Tasks" }` into `staffNavLinks` between `/team` and `/history`

### Reused (no changes)
- `PATCH /api/tasks/[id]` — status writes
- `StatusBadge`, `PriorityBadge`, `BucketBadge` — column rendering
- `DropdownMenu` (shadcn) — status popup
- `requireSession`, `requireTeam`, `canEditTask` — auth and permissions

## Database

No schema change. No migration.

## Testing

### Unit tests — `lib/all-tasks-query`

The helper module has two exports: `parseParams(searchParams)` returning `{ where, sort, dir }`, and `sortTasks(tasks, sort, dir)` returning the ordered array. Tests cover:

**`parseParams`**
- Default — no params yields `status: { in: [<five active statuses>] }`, no `assignedToId` or `bucketId` constraint, sort `dueDate`, dir `asc`
- `status[]` filter — single value, multiple values; values not in the allowed set are dropped (so `status=done` and `status=boulder` are silently ignored)
- `assignedTo=<id>` → `assignedToId: id`; `assignedTo=unassigned` → `assignedToId: null`
- `bucketId=<id>` → `bucketId: id`; `bucketId=uncategorized` → `bucketId: null`
- `sort` and `dir` — invalid values fall back to the defaults

**`sortTasks`**
- Each `sort` × `dir` combination produces the documented order, including null placement (due-date nulls last on asc / first on desc; owner nulls always grouped at end)

### Manual smoke

UI work requires browser verification per the project guidance. Verify:

- Page loads with the active team's tasks; row count matches subtitle
- Each column header sorts asc/desc with correct null placement
- Each filter narrows the result set as documented
- Clicking a status badge opens the dropdown; selecting a status updates the row and persists across reload
- Marking a task `done` from the popup removes it from `/all-tasks` and adds it to `/history`
- Status change made on `/all-tasks` is reflected on `/tasks` (My Tasks) for the same task after SWR revalidation
- Switching active team changes the result set
- Cross-team isolation: a task in another team is not visible
- 403 path: when `canEditTask` rejects a status change, the toast appears and the row does not change
