# User Tasks View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/team/[id]` look like My Tasks but for another user (active tasks grouped by status, boulders, completed, plus manager-gated todos), change `/team` to link there instead of the profile, and make Admin → Users names link to the profile.

**Architecture:** `/team/[id]` is rewritten to reuse the existing `ReadOnlyTaskCard` helper inside a My-Tasks-style section layout (active, stalled/blocked, boulders, completed, todos). Todos are fetched from an extended `/api/todos?userId=<id>` endpoint that adds a manager-only access gate for cross-user reads. The two small navigation tweaks (`/team` card link and admin users table name link) finish the wiring.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, SWR

---

### Task 1: Add `userId` query param to todos API with manager gate

**Files:**
- Modify: `src/app/api/todos/route.ts`

- [ ] **Step 1: Update the `GET` handler**

Replace the current `GET` function (lines 6-19) with:

```typescript
export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const teamId = await requireTeam();
    const requestedUserId = request.nextUrl.searchParams.get("userId");

    let targetUserId = user.id;
    if (requestedUserId && requestedUserId !== user.id) {
      const viewerRole = await getTeamRole(user.id, teamId);
      if (!user.isSuperAdmin && viewerRole !== "manager") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      targetUserId = requestedUserId;
    }

    const todos = await prisma.todo.findMany({
      where: { userId: targetUserId, teamId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, createdAt: true },
    });
    return NextResponse.json({ todos });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 2: Add the `getTeamRole` import at the top of the file**

Change the existing import block at lines 1-4 to add `getTeamRole`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { getTeamRole } from "@/lib/team-auth";
import { awardAction } from "@/lib/gamification";
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v urgency.test.ts | grep error || echo "OK"`
Expected: `OK`

- [ ] **Step 4: Manual smoke test**

Start `npx next dev` and in another terminal:

```bash
# As current user (should work, returns your own todos)
curl -b "repan_session=<your-session-cookie>" "http://localhost:3000/api/todos"

# As current user with their own userId (should work)
curl -b "repan_session=<your-session-cookie>" "http://localhost:3000/api/todos?userId=<your-id>"

# As a staff user, targeting another user's id (should return 403)
curl -b "repan_session=<staff-session-cookie>" "http://localhost:3000/api/todos?userId=<other-id>"

# As a manager, targeting a team member's id (should return their todos)
curl -b "repan_session=<manager-session-cookie>" "http://localhost:3000/api/todos?userId=<other-id>"
```

Expected: 200 for self/manager reads, 403 for staff cross-user reads.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/todos/route.ts
git commit -m "feat: allow managers to read other users' todos via userId param"
```

---

### Task 2: Rewrite `/team/[id]` to match My Tasks layout

**Files:**
- Modify: `src/app/team/[id]/page.tsx`

This task replaces the existing tasks section in `/team/[id]` with a My-Tasks-style layout. The `ReadOnlyTaskCard` helper at lines 77-133 stays. The imports, user header card (lines 188-246), and loading/not-found states (lines 159-185) stay. Only the tasks section rendering (lines 248-303) and a few pieces of supporting state change.

- [ ] **Step 1: Update the top-of-file imports**

The current imports are at lines 1-14. Replace them with:

```typescript
"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Star, ClipboardList, Clock, AlertTriangle, ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StreakFlame } from "@/components/gamification/streak-flame";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { useUser } from "@/components/user-context";
import { cn } from "@/lib/utils";
```

Note: `Separator` is removed (no longer used); `useState`, `ChevronDown`, `ChevronRight`, `CheckCircle2`, `AlertCircle`, and `useUser` are added.

- [ ] **Step 2: Add a Todo type above the UserDetail interface**

Find the `interface UserDetail` at line 37 and insert this right before it:

```typescript
interface Todo {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
}
```

- [ ] **Step 3: Replace the page component's data fetching and derived values**

In `TeamMemberDetailPage` (starting at line 135), replace the body starting with `const { id } = use(params);` and ending just before `if (userLoading) {` (roughly lines 140-158) with:

```typescript
  const { id } = use(params);
  const { user: viewer } = useUser();

  const canViewTodos = !!viewer && (viewer.isSuperAdmin || viewer.teamRole === "manager");

  const { data: user, isLoading: userLoading } = useSWR<UserDetail>(
    `/api/users/${id}`
  );
  const { data: tasksData, isLoading: tasksLoading } = useSWR<{ tasks: Task[] }>(
    `/api/tasks?assignedTo=${id}`
  );
  const { data: todosData } = useSWR<{ todos: Todo[] }>(
    canViewTodos ? `/api/todos?userId=${id}` : null
  );

  const tasks = tasksData?.tasks ?? [];
  const todos = todosData?.todos ?? [];
  const streaks = user?.streaks ?? [];

  const dailyStreak = streaks.find((s) => s.streakType === "daily_checkin");
  const momentumStreak = streaks.find((s) => s.streakType === "weekly_momentum");

  const boulderTasks = tasks.filter((t) => t.status === "boulder");
  const stalledOrBlockedTasks = tasks.filter(
    (t) => t.status === "stalled" || t.status === "blocked" || t.status === "paused"
  );
  const activeTasks = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.status !== "boulder" &&
      t.status !== "stalled" &&
      t.status !== "blocked" &&
      t.status !== "paused"
  );
  const completedTasks = tasks.filter((t) => t.status === "done");
  const totalBoulderAllocation = boulderTasks.reduce(
    (sum, t) => sum + ((t as Task & { timeAllocation?: number }).timeAllocation ?? 0),
    0
  );

  const [showCompleted, setShowCompleted] = useState(false);
  const [showTodos, setShowTodos] = useState(true);
```

- [ ] **Step 4: Replace the Tasks section in the JSX**

Find the Tasks block at lines 248-303 (starts with `{/* Tasks */}` and the outer `<div className="space-y-4">...`) and replace it with:

```tsx
      {/* Tasks */}
      {tasksLoading ? (
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 && todos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <ClipboardList className="size-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">No tasks yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active tasks */}
          {activeTasks.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
              {activeTasks.map((task) => (
                <ReadOnlyTaskCard key={task.id} task={task} />
              ))}
            </div>
          )}

          {/* To Dos (manager-gated) */}
          {canViewTodos && todos.length > 0 && (
            <div>
              <button
                onClick={() => setShowTodos((v) => !v)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {showTodos ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <span>{todos.length} to do{todos.length !== 1 ? "s" : ""}</span>
              </button>
              {showTodos && (
                <div className="space-y-1.5 mt-1">
                  {todos.map((todo) => (
                    <div
                      key={todo.id}
                      className="rounded-lg border border-border bg-card px-3 py-2"
                    >
                      <p className="text-sm font-medium line-clamp-1">{todo.title}</p>
                      {todo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {todo.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stalled / Blocked tasks */}
          {stalledOrBlockedTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <AlertCircle className="size-4 text-orange-500" />
                <span>{stalledOrBlockedTasks.length} stalled or blocked</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                {stalledOrBlockedTasks.map((task) => (
                  <ReadOnlyTaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )}

          {/* Boulders section */}
          {boulderTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-purple-700 dark:text-purple-400">Boulders</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Ongoing operational efforts</p>
                </div>
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-full px-2.5 py-1">
                  {totalBoulderAllocation}% of time allocated
                </span>
              </div>
              <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 p-3">
                <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                  {boulderTasks.map((task) => (
                    <ReadOnlyTaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Completed tasks — collapsed section */}
          {completedTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {showCompleted ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <CheckCircle2 className="size-4 text-green-500" />
                <span>{completedTasks.length} completed task{completedTasks.length !== 1 ? "s" : ""}</span>
              </button>
              {showCompleted && (
                <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 mt-2">
                  {completedTasks.map((task) => (
                    <ReadOnlyTaskCard key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
```

- [ ] **Step 5: Add `timeAllocation` to the local `Task` interface**

The boulder allocation read uses `timeAllocation`. Update the `interface Task` at lines 19-29 to add the field:

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

With this change the `as Task & { timeAllocation?: number }` cast inside the reduce becomes redundant — simplify the reduce to:

```typescript
  const totalBoulderAllocation = boulderTasks.reduce(
    (sum, t) => sum + (t.timeAllocation ?? 0),
    0
  );
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v urgency.test.ts | grep error || echo "OK"`
Expected: `OK`

- [ ] **Step 7: Manual smoke test**

Start the dev server, sign in as a manager, navigate to `/team/<some-team-member-id>`. Verify:
- User name appears as the H1 (no "My Tasks" or "Tasks" suffix)
- "View Profile" button still present and links to `/profile/<id>`
- Active tasks render in a grid; stalled/blocked tasks render with the orange AlertCircle header; boulders render in the purple panel; completed tasks collapse under a chevron
- Todos section appears under the active tasks block with a chevron toggle

Then sign in as a staff user (or a supervisor) and navigate to the same page — verify the Todos section does not appear.

- [ ] **Step 8: Commit**

```bash
git add src/app/team/[id]/page.tsx
git commit -m "feat: restyle /team/[id] as user tasks view with manager-gated todos"
```

---

### Task 3: Change `/team` member card link to `/team/[id]`

**Files:**
- Modify: `src/app/team/page.tsx:132`

- [ ] **Step 1: Update the Link href**

Find the member card name link (around line 132-137). Change:

```tsx
            <Link
              href={`/profile/${user.id}`}
              className="font-semibold text-sm hover:text-primary hover:underline transition-colors"
            >
              {user.name}
            </Link>
```

to:

```tsx
            <Link
              href={`/team/${user.id}`}
              className="font-semibold text-sm hover:text-primary hover:underline transition-colors"
            >
              {user.name}
            </Link>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v urgency.test.ts | grep error || echo "OK"`
Expected: `OK`

- [ ] **Step 3: Manual smoke test**

Load `/team`, click any team member's name. Confirm the browser navigates to `/team/<id>` and shows the new layout.

- [ ] **Step 4: Commit**

```bash
git add src/app/team/page.tsx
git commit -m "feat: /team member cards link to /team/[id] instead of profile"
```

---

### Task 4: Link user names in Admin → Users to `/profile/[id]`

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add the `next/link` import**

Find the existing import block at the top of `src/app/admin/page.tsx`. After the other imports, add:

```typescript
import Link from "next/link";
```

Place it alongside the other third-party imports (near the `import { csrfFetch }`-style imports).

- [ ] **Step 2: Wrap the user name in a Link**

Find the user-name span in the Users table row (around lines 665-667):

```tsx
                              <span className="text-sm text-zinc-200 font-medium">
                                {u.name}
                              </span>
```

Replace with:

```tsx
                              <Link
                                href={`/profile/${u.id}`}
                                className="text-sm text-zinc-200 font-medium hover:text-primary hover:underline transition-colors"
                              >
                                {u.name}
                              </Link>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v urgency.test.ts | grep error || echo "OK"`
Expected: `OK`

- [ ] **Step 4: Manual smoke test**

Load Admin → Users as a super admin. Click any user's name in the table. Confirm the browser navigates to `/profile/<id>` (the profile page with badges, points, history).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: link user names in Admin → Users to profile page"
```

---

### Task 5: End-to-end verification

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx jest --no-coverage 2>&1 | tail -10`
Expected: 104 tests pass, no failures.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit 2>&1 | grep -v urgency.test.ts | grep error || echo "OK"`
Expected: `OK`

- [ ] **Step 3: Full navigation smoke test**

With `npx next dev` running:

1. Sign in as a manager. Go to `/team`, click a team member → lands on `/team/[id]` with My Tasks layout + todos section visible
2. On `/team/[id]`, click "View Profile" → lands on `/profile/[id]`
3. Go to Admin → Users, click a user's name → lands on `/profile/[id]`
4. Sign out, sign in as a staff user. Go to `/team`, click a team member → lands on `/team/[id]` but todos section is absent (even if the target user has todos)
5. Confirm `/tasks` (My Tasks) is untouched — still shows your own tasks, todos, backlog, create buttons
