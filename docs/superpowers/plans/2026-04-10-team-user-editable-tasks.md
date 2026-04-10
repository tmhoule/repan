# Editable Tasks on /team/[id] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make tasks on `/team/[id]` fully interactive (edit status, progress, comments, etc.) for any team member, matching the My Tasks experience.

**Architecture:** Broaden `canEditTask()` to allow any user with a `"member"` team role (in addition to the existing manager/creator/assignee fast-path) — the backend already validates team membership before calling this function. Then swap the local `ReadOnlyTaskCard` helper on `/team/[id]` for the shared `TaskCard` component used on My Tasks. Supervisors stay restricted; delete/reorder/admin permissions stay unchanged.

**Tech Stack:** Next.js, TypeScript, Jest, SWR

---

### Task 1: Broaden `canEditTask` to allow team members

**Files:**
- Modify: `src/lib/permissions.ts`
- Modify: `__tests__/lib/permissions.test.ts`

- [ ] **Step 1: Write the failing test**

Append a new test to the existing `describe("canEditTask", ...)` block in `__tests__/lib/permissions.test.ts` (after line 10, before the closing `});` on line 11). The block currently reads:

```typescript
describe("canEditTask", () => {
  it("manager can edit any", () => { expect(canEditTask(manager, { createdById: "x", assignedToId: "x" })).toBe(true); });
  it("staff assigned", () => { expect(canEditTask(staff, { createdById: "x", assignedToId: "s1" })).toBe(true); });
  it("staff created", () => { expect(canEditTask(staff, { createdById: "s1", assignedToId: "x" })).toBe(true); });
  it("staff neither", () => { expect(canEditTask(staff, { createdById: "x", assignedToId: "x" })).toBe(false); });
});
```

Replace with:

```typescript
describe("canEditTask", () => {
  it("manager can edit any", () => { expect(canEditTask(manager, { createdById: "x", assignedToId: "x" })).toBe(true); });
  it("staff assigned", () => { expect(canEditTask(staff, { createdById: "x", assignedToId: "s1" })).toBe(true); });
  it("staff created", () => { expect(canEditTask(staff, { createdById: "s1", assignedToId: "x" })).toBe(true); });
  it("staff neither (no team role)", () => { expect(canEditTask(staff, { createdById: "x", assignedToId: "x" })).toBe(false); });
  it("team member can edit any team task", () => {
    const teamMember = { id: "tm1", role: "staff" as const, teamRole: "member" as const };
    expect(canEditTask(teamMember, { createdById: "x", assignedToId: "y" })).toBe(true);
  });
});
```

Changes:
- Renamed "staff neither" → "staff neither (no team role)" to make the intent explicit.
- Added "team member can edit any team task" — the new behavior.

- [ ] **Step 2: Run tests to verify the new test fails**

Run: `npx jest __tests__/lib/permissions.test.ts --no-coverage 2>&1 | tail -20`

Expected: The "team member can edit any team task" test FAILS because `canEditTask` currently returns `false` for a team member who is neither creator nor assignee. Other tests should still pass.

- [ ] **Step 3: Update `canEditTask` to allow team members**

In `src/lib/permissions.ts`, replace the current `canEditTask` function (lines 4-7):

```typescript
export function canEditTask(user: UserContext, task: TaskContext): boolean {
  if (user.teamRole === "manager" || user.role === "manager") return true;
  return task.createdById === user.id || task.assignedToId === user.id;
}
```

with:

```typescript
export function canEditTask(user: UserContext, task: TaskContext): boolean {
  if (user.teamRole === "manager" || user.role === "manager") return true;
  if (task.createdById === user.id || task.assignedToId === user.id) return true;
  // Any team member can edit team tasks; changes are tracked in TaskActivity.
  // Supervisors remain read-only.
  return user.teamRole === "member";
}
```

Leave all other functions in the file alone. `canDeleteTask`, `canAccessAdmin`, `canReorderBacklog`, and `canViewFullReports` are unchanged.

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx jest __tests__/lib/permissions.test.ts --no-coverage 2>&1 | tail -20`

Expected: All tests PASS, including the new "team member can edit any team task" and the existing "supervisor cannot edit tasks" (because supervisor's teamRole is "supervisor", not "member").

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions.ts __tests__/lib/permissions.test.ts
git commit -m "feat: allow any team member to edit team tasks"
```

---

### Task 2: Replace `ReadOnlyTaskCard` with `TaskCard` on `/team/[id]`

**Files:**
- Modify: `src/app/team/[id]/page.tsx`

This task swaps the local read-only helper for the shared interactive `TaskCard` component. After the swap, viewers with edit permission (now any team member per Task 1) can change status, progress, comments, etc. directly from this page. The local `ReadOnlyTaskCard` helper and its `formatDueDate` companion become dead code and are removed.

- [ ] **Step 1: Update imports**

The current imports at lines 1-14 of `src/app/team/[id]/page.tsx` include helpers and icons only used by `ReadOnlyTaskCard`. After the swap, the only task-related import we need is `TaskCard`. The imports should become:

```typescript
"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { ArrowLeft, Star, ClipboardList, ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { StreakFlame } from "@/components/gamification/streak-flame";
import { TaskCard } from "@/components/tasks/task-card";
import { useUser } from "@/components/user-context";
```

Changes:
- Added `useSWRConfig` from `swr` (for cache invalidation in the `onUpdate` callback)
- Added `TaskCard` import
- Removed `Clock`, `AlertTriangle` (only used in `ReadOnlyTaskCard`)
- Removed `CardHeader` (only used in `ReadOnlyTaskCard`; the user header uses `CardContent` only)
- Removed `StatusBadge`, `PriorityBadge` (only used in `ReadOnlyTaskCard`)
- Removed `cn` from `@/lib/utils` (only used in `ReadOnlyTaskCard`)

- [ ] **Step 2: Remove the `ReadOnlyTaskCard` and `formatDueDate` helpers**

Delete the entire `formatDueDate` function (currently lines 64-83) and the entire `ReadOnlyTaskCard` function (currently lines 85-141). After deletion, the `Task`, `Streak`, `Todo`, and `UserDetail` interfaces, and the `getInitials` helper, remain — only the two helper functions are removed.

- [ ] **Step 3: Augment the `Task` interface with `TaskCard`-required fields**

The `TaskCard` component expects additional fields on its `Task` prop that the current local `Task` interface doesn't include. Update the local `Task` interface to match what `TaskCard` expects.

Current (at lines 19-30):

```typescript
interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  percentComplete: number;
  timeAllocation?: number;
  dueDate: string | null;
  blockerReason?: string | null;
  createdBy: { id: string; name: string; avatarColor: string };
  assignedTo?: { id: string; name: string; avatarColor: string } | null;
}
```

Replace with:

```typescript
interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  effortEstimate: "small" | "medium" | "large";
  percentComplete: number;
  timeAllocation: number;
  dueDate: string | null;
  updatedAt?: string;
  createdAt?: string;
  blockerReason?: string | null;
  createdBy: { id: string; name: string; avatarColor: string } | null;
  assignedTo?: { id: string; name: string; avatarColor: string } | null;
}
```

Changes:
- Added `effortEstimate` (required by `TaskCard` for point display)
- Changed `timeAllocation` from optional to required (matches `TaskCard`)
- Added optional `updatedAt`, `createdAt` (used for staleness indicator)
- Made `createdBy` nullable (matches `TaskCard`)

These fields are all returned by the `/api/tasks` endpoint already, so no API changes are needed — this is purely a type refinement to unblock the component swap.

- [ ] **Step 4: Add the SWR mutate helper for the onUpdate callback**

In the `TeamMemberDetailPage` component (currently at line 143), inside the function body right after `const { id } = use(params);`, add a call to `useSWRConfig`:

```typescript
  const { id } = use(params);
  const { user: viewer } = useUser();
  const { mutate: swrMutate } = useSWRConfig();
```

- [ ] **Step 5: Build a `handleTaskUpdate` callback**

Still in `TeamMemberDetailPage`, add a callback right before the `const [showCompleted, setShowCompleted] = useState(false);` line (the useState hooks at the bottom of the derived-values block):

```typescript
  const handleTaskUpdate = () => {
    swrMutate(`/api/tasks?assignedTo=${id}`);
  };
```

This tells SWR to refetch the user's task list after any edit so the view updates.

- [ ] **Step 6: Replace `ReadOnlyTaskCard` usages with `TaskCard`**

Inside the Tasks JSX block, find every occurrence of `<ReadOnlyTaskCard key={task.id} task={task} />` (there are four — one each for active, stalled/blocked, boulders, and completed sections). Replace each with:

```tsx
<TaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} />
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v urgency.test.ts | grep error || echo "OK"`

Expected: `OK`. If there are type errors, they most likely come from:
- Fields missing on the `Task` interface — cross-check step 3
- Unused imports — remove any import that no longer has references in the file

- [ ] **Step 8: Run all tests**

Run: `npx jest --no-coverage 2>&1 | tail -10`

Expected: All 105 tests pass (104 prior + 1 new from Task 1).

- [ ] **Step 9: Manual smoke test**

Start the dev server with `npx next dev`. Sign in as a manager. Go to `/team`, click a teammate's name, verify the page loads with `/team/[id]` and:
- Each task card is now interactive (progress slider works, status dropdown is clickable)
- Changing a task's status or progress from this page takes effect and the page re-renders
- Completed section still collapses; boulder section still has purple panel; stalled/blocked section still shows orange icon

Then sign in as a regular team member (staff, teamRole=member), go to the same `/team/[id]` for a different user, and verify you can also edit their tasks.

- [ ] **Step 10: Commit**

```bash
git add src/app/team/[id]/page.tsx
git commit -m "feat: use interactive TaskCard on /team/[id]"
```

---

### Task 3: End-to-end verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx jest --no-coverage 2>&1 | tail -10`

Expected: 105 passing, 0 failing.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v urgency.test.ts | grep error || echo "OK"`

Expected: `OK`.

- [ ] **Step 3: Final review of changed files**

Run: `git diff HEAD~2..HEAD --stat`

Expected output should show ~3 files changed: `src/lib/permissions.ts`, `__tests__/lib/permissions.test.ts`, `src/app/team/[id]/page.tsx`. No unrelated changes.
