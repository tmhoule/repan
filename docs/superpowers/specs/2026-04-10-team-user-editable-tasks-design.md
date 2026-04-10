# Editable Tasks on /team/[id]

## Problem

The `/team/[id]` page (the "user tasks view" shipped in the previous feature) renders tasks with a local `ReadOnlyTaskCard` helper that strips out all interactive controls. When a manager clicks into a teammate's page to help or update a task, they can't change status, progress, or add comments — even though the backend allows those operations from anywhere else. It's inconsistent and frustrating.

## Solution

1. Replace the local `ReadOnlyTaskCard` helper on `/team/[id]` with the full interactive `TaskCard` component used on My Tasks.
2. Broaden `canEditTask()` in `src/lib/permissions.ts` to allow any team member on the task's team, not just managers/creators/assignees. All edits continue to be recorded in `TaskActivity`, so the history/audit trail stays intact.

## Permission Model

### `canEditTask` — broadened

Before: manager OR global manager OR creator OR assignee.
After: any user with a `teamRole` (i.e., any team member) can edit. Since API routes already enforce team membership before calling this function, the effective rule is "any member of the task's team can edit".

This aligns task editing with the existing comment model, where any team member can already post a comment on any team task via `POST /api/tasks/[id]/comments` without hitting `canEditTask`.

### What stays restricted

- `canDeleteTask()` — unchanged. Deletion remains manager OR creator OR assignee. Destructive action, stays narrow.
- `canReorderBacklog()` — unchanged. Manager-only.
- `canAccessAdmin()` — unchanged.
- `canViewFullReports()` — unchanged.

## Client-side Changes

### `src/app/team/[id]/page.tsx`

Replace the local `ReadOnlyTaskCard` helper with the shared `TaskCard` component imported from `@/components/tasks/task-card`. Pass an `onUpdate` callback that revalidates the `/api/tasks?assignedTo=<id>` SWR key so the page refreshes after edits.

Removed (no longer used after swapping):

- `ReadOnlyTaskCard` helper function
- `formatDueDate` helper function (lives in `task-card.tsx` for its own use)
- `StatusBadge`, `PriorityBadge`, `Clock`, `AlertTriangle`, `cn` imports if they're only used inside the removed helper — keep any that are still referenced in the user header card
- `CardHeader` import if only the helper used it

### Delete button visibility

`TaskCard` already computes `canDelete` client-side (line 182) as `isManager OR creator OR assignee`, so the delete button will naturally be hidden for non-authorized viewers. No extra work needed.

## Tests

Update `__tests__/lib/permissions.test.ts`:

- Existing `canEditTask` tests: the "staff neither" case (staff member who is neither creator nor assignee) currently expects `false`. After the change, any team member can edit — so this test's expectation flips to `true` when the user has a `teamRole`, or stays `false` when they don't. Pick whichever setup matches the new behavior.
- Add a new test: a staff team member (teamRole: "member") who is neither creator nor assignee can edit a team task.
- Leave `canDeleteTask` tests alone — delete semantics unchanged.

## Scope

- `src/lib/permissions.ts` — `canEditTask()` body
- `__tests__/lib/permissions.test.ts` — update + add tests
- `src/app/team/[id]/page.tsx` — swap component, clean up imports
