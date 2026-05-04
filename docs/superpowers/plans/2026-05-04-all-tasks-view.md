# All Tasks View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `/all-tasks` page that lists every active (non-`done`, non-`boulder`, non-archived) task in the user's current team, with filtering, sortable columns, and an inline status-change popup.

**Architecture:** A new client page (`src/app/all-tasks/page.tsx`) consumes a new GET endpoint (`src/app/api/tasks/all/route.ts`) that fetches team-scoped tasks via Prisma. A small pure-helper module (`src/lib/all-tasks-query.ts`) parses URL params into a Prisma where-clause and sorts the result set in memory. Status changes reuse the existing `PATCH /api/tasks/[id]` endpoint, whose `canEditTask` check is the authoritative permission gate. The header gets one new nav link between "Team" and "History".

**Tech Stack:** Next.js (custom build, see `AGENTS.md`), TypeScript, Prisma, SWR (provider already configured), shadcn/ui (Card, Button, DropdownMenu, Badge), Tailwind, Jest + jsdom (unit tests in `__tests__/lib/`), `sonner` for toasts, `csrfFetch` from `src/lib/csrf-client.ts` for state-changing requests.

**Conventions to respect:**
- Project rule (per `AGENTS.md`): the Next.js in this repo has breaking changes vs your training data. Read `node_modules/next/dist/docs/` before adding any framework-level pattern that's new to you.
- The DB runs in Docker; the app runs on host. Never start a Docker app instance to test. Use the dev server (`npm run dev`) and a browser, or run unit tests with Jest.
- No `Co-Authored-By` line in commits.
- Roles are per-team only — don't show or assume a global `User.role` badge in this view.

---

## File Structure

### New files
- `src/lib/all-tasks-query.ts` — pure helpers: `parseParams(searchParams)` and `sortTasks(tasks, sort, dir)`. No I/O, no Prisma client — only types and pure logic. Importable from both the route and tests.
- `src/app/api/tasks/all/route.ts` — `GET` endpoint. Imports `parseParams` and `sortTasks`. Adds team scoping and the Prisma fetch.
- `src/app/all-tasks/page.tsx` — client page. Owns filter UI state, builds the SWR key, renders the table, owns the status popup.
- `__tests__/lib/all-tasks-query.test.ts` — unit tests for the helper module.

### Modified files
- `src/components/layout/header.tsx` — add `{ href: "/all-tasks", label: "All Tasks" }` to `staffNavLinks` between `/team` and `/history`.

### Reused (no changes)
- `src/lib/session.ts` — `requireSession`, `requireTeam`, `handleApiError`
- `src/lib/db.ts` — `prisma` client
- `src/lib/csrf-client.ts` — `csrfFetch` for the status PATCH
- `src/components/tasks/status-badge.tsx`, `priority-badge.tsx`
- `src/components/buckets/bucket-badge.tsx`
- `src/components/ui/dropdown-menu.tsx`, `card.tsx`, `button.tsx`, `input.tsx`, `label.tsx`
- `PATCH /api/tasks/[id]` (with its existing `canEditTask` check)
- `/api/users` (returns the active team's members) and `/api/buckets`

---

## Task 1: Helper module (`lib/all-tasks-query`) — types, constants, and skeleton

**Files:**
- Create: `src/lib/all-tasks-query.ts`

This task introduces the module with its public surface so later tasks can build on stable types. No logic yet beyond constants.

- [ ] **Step 1: Create the module with types and the allowed-status set**

```ts
// src/lib/all-tasks-query.ts

export type ActiveTaskStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "stalled"
  | "paused";

export const ACTIVE_STATUSES: readonly ActiveTaskStatus[] = [
  "not_started",
  "in_progress",
  "blocked",
  "stalled",
  "paused",
] as const;

export type SortKey = "dueDate" | "priority" | "owner" | "title";
export type SortDir = "asc" | "desc";

export const SORT_KEYS: readonly SortKey[] = ["dueDate", "priority", "owner", "title"] as const;
export const SORT_DIRS: readonly SortDir[] = ["asc", "desc"] as const;

export type AllTasksWhere = {
  status: { in: ActiveTaskStatus[] };
  assignedToId?: string | null;
  bucketId?: string | null;
};

export type ParsedParams = {
  where: AllTasksWhere;
  sort: SortKey;
  dir: SortDir;
};

export type SortableTask = {
  title: string;
  priority: "high" | "medium" | "low";
  dueDate: Date | string | null;
  assignedTo: { name: string } | null;
};

export function parseParams(_searchParams: URLSearchParams): ParsedParams {
  throw new Error("not implemented");
}

export function sortTasks<T extends SortableTask>(_tasks: T[], _sort: SortKey, _dir: SortDir): T[] {
  throw new Error("not implemented");
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/all-tasks-query.ts
git commit -m "feat(all-tasks): scaffold all-tasks-query helper module"
```

---

## Task 2: `parseParams` — TDD

**Files:**
- Create: `__tests__/lib/all-tasks-query.test.ts`
- Modify: `src/lib/all-tasks-query.ts`

- [ ] **Step 1: Write the failing tests for `parseParams`**

```ts
// __tests__/lib/all-tasks-query.test.ts
import { parseParams, ACTIVE_STATUSES } from "@/lib/all-tasks-query";

function p(qs: string) {
  return parseParams(new URLSearchParams(qs));
}

describe("parseParams — defaults", () => {
  it("with no params, status is the five active statuses, no assignedToId, no bucketId, sort=dueDate, dir=asc", () => {
    const result = p("");
    expect(result.where.status.in).toEqual([...ACTIVE_STATUSES]);
    expect("assignedToId" in result.where).toBe(false);
    expect("bucketId" in result.where).toBe(false);
    expect(result.sort).toBe("dueDate");
    expect(result.dir).toBe("asc");
  });
});

describe("parseParams — status filter", () => {
  it("single value passes through", () => {
    expect(p("status=in_progress").where.status.in).toEqual(["in_progress"]);
  });
  it("multiple values pass through", () => {
    expect(p("status=in_progress&status=blocked").where.status.in.sort()).toEqual(["blocked", "in_progress"]);
  });
  it("ignores values not in the active set (done, boulder)", () => {
    expect(p("status=done&status=boulder&status=in_progress").where.status.in).toEqual(["in_progress"]);
  });
  it("ignores garbage values", () => {
    expect(p("status=banana").where.status.in).toEqual([...ACTIVE_STATUSES]);
  });
  it("if all values are invalid, falls back to the full active set", () => {
    expect(p("status=done&status=boulder").where.status.in).toEqual([...ACTIVE_STATUSES]);
  });
});

describe("parseParams — assignedTo", () => {
  it("a user id sets assignedToId to that id", () => {
    expect(p("assignedTo=user_123").where.assignedToId).toBe("user_123");
  });
  it("the literal 'unassigned' sets assignedToId to null", () => {
    const r = p("assignedTo=unassigned");
    expect(r.where.assignedToId).toBeNull();
  });
});

describe("parseParams — bucketId", () => {
  it("a bucket id sets bucketId to that id", () => {
    expect(p("bucketId=bkt_1").where.bucketId).toBe("bkt_1");
  });
  it("the literal 'uncategorized' sets bucketId to null", () => {
    expect(p("bucketId=uncategorized").where.bucketId).toBeNull();
  });
});

describe("parseParams — sort and dir", () => {
  it("valid sort and dir pass through", () => {
    expect(p("sort=priority&dir=desc")).toMatchObject({ sort: "priority", dir: "desc" });
  });
  it("invalid sort falls back to dueDate", () => {
    expect(p("sort=banana").sort).toBe("dueDate");
  });
  it("invalid dir falls back to asc", () => {
    expect(p("dir=banana").dir).toBe("asc");
  });
});
```

- [ ] **Step 2: Run the tests — they should fail**

Run: `npx jest __tests__/lib/all-tasks-query.test.ts`
Expected: every `parseParams` test fails with `not implemented`.

- [ ] **Step 3: Implement `parseParams`**

Replace the throw-stub in `src/lib/all-tasks-query.ts` with:

```ts
export function parseParams(searchParams: URLSearchParams): ParsedParams {
  const requestedStatuses = searchParams.getAll("status")
    .filter((s): s is ActiveTaskStatus => (ACTIVE_STATUSES as readonly string[]).includes(s));
  const status = { in: requestedStatuses.length > 0 ? requestedStatuses : [...ACTIVE_STATUSES] };

  const where: AllTasksWhere = { status };

  const assignedTo = searchParams.get("assignedTo");
  if (assignedTo === "unassigned") where.assignedToId = null;
  else if (assignedTo) where.assignedToId = assignedTo;

  const bucketId = searchParams.get("bucketId");
  if (bucketId === "uncategorized") where.bucketId = null;
  else if (bucketId) where.bucketId = bucketId;

  const rawSort = searchParams.get("sort");
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as SortKey) : "dueDate";

  const rawDir = searchParams.get("dir");
  const dir: SortDir = (SORT_DIRS as readonly string[]).includes(rawDir ?? "")
    ? (rawDir as SortDir) : "asc";

  return { where, sort, dir };
}
```

- [ ] **Step 4: Run the tests — they should pass**

Run: `npx jest __tests__/lib/all-tasks-query.test.ts`
Expected: all `parseParams` tests pass; `sortTasks` tests don't exist yet.

- [ ] **Step 5: Commit**

```bash
git add src/lib/all-tasks-query.ts __tests__/lib/all-tasks-query.test.ts
git commit -m "feat(all-tasks): implement parseParams helper"
```

---

## Task 3: `sortTasks` — TDD

**Files:**
- Modify: `__tests__/lib/all-tasks-query.test.ts`
- Modify: `src/lib/all-tasks-query.ts`

- [ ] **Step 1: Append failing tests for `sortTasks`**

Append to `__tests__/lib/all-tasks-query.test.ts`:

```ts
import { sortTasks, type SortableTask } from "@/lib/all-tasks-query";

type T = SortableTask & { id: string };
const t = (id: string, fields: Partial<T> = {}): T => ({
  id,
  title: id,
  priority: "medium",
  dueDate: null,
  assignedTo: null,
  ...fields,
});

describe("sortTasks — title", () => {
  it("asc: alphabetical", () => {
    const ids = sortTasks([t("Beta"), t("alpha"), t("Charlie")], "title", "asc").map(x => x.id);
    expect(ids).toEqual(["alpha", "Beta", "Charlie"]);
  });
  it("desc: reverse alphabetical", () => {
    const ids = sortTasks([t("Beta"), t("alpha"), t("Charlie")], "title", "desc").map(x => x.id);
    expect(ids).toEqual(["Charlie", "Beta", "alpha"]);
  });
});

describe("sortTasks — priority", () => {
  it("asc: high → medium → low", () => {
    const ids = sortTasks([
      t("L", { priority: "low" }),
      t("H", { priority: "high" }),
      t("M", { priority: "medium" }),
    ], "priority", "asc").map(x => x.id);
    expect(ids).toEqual(["H", "M", "L"]);
  });
  it("desc: low → medium → high", () => {
    const ids = sortTasks([
      t("L", { priority: "low" }),
      t("H", { priority: "high" }),
      t("M", { priority: "medium" }),
    ], "priority", "desc").map(x => x.id);
    expect(ids).toEqual(["L", "M", "H"]);
  });
});

describe("sortTasks — dueDate", () => {
  const A = t("A", { dueDate: new Date("2026-05-10") });
  const B = t("B", { dueDate: new Date("2026-05-01") });
  const N1 = t("N1", { dueDate: null });
  const N2 = t("N2", { dueDate: null });

  it("asc: earliest first, nulls last", () => {
    const ids = sortTasks([N1, A, N2, B], "dueDate", "asc").map(x => x.id);
    expect(ids.slice(0, 2)).toEqual(["B", "A"]);
    expect(ids.slice(2).sort()).toEqual(["N1", "N2"]);
  });
  it("desc: latest first, nulls first", () => {
    const ids = sortTasks([A, N1, B, N2], "dueDate", "desc").map(x => x.id);
    expect(ids.slice(0, 2).sort()).toEqual(["N1", "N2"]);
    expect(ids.slice(2)).toEqual(["A", "B"]);
  });
  it("accepts ISO strings as well as Date objects", () => {
    const X = t("X", { dueDate: "2026-04-30" as any });
    const ids = sortTasks([A, X, B], "dueDate", "asc").map(x => x.id);
    expect(ids).toEqual(["X", "B", "A"]);
  });
});

describe("sortTasks — owner", () => {
  const Alice = t("alice", { assignedTo: { name: "Alice" } });
  const Bob = t("bob", { assignedTo: { name: "Bob" } });
  const Una = t("una", { assignedTo: null });
  const Unb = t("unb", { assignedTo: null });

  it("asc: A→Z, nulls grouped at end", () => {
    const ids = sortTasks([Una, Bob, Alice, Unb], "owner", "asc").map(x => x.id);
    expect(ids.slice(0, 2)).toEqual(["alice", "bob"]);
    expect(ids.slice(2).sort()).toEqual(["una", "unb"]);
  });
  it("desc: Z→A, nulls still at end", () => {
    const ids = sortTasks([Una, Bob, Alice, Unb], "owner", "desc").map(x => x.id);
    expect(ids.slice(0, 2)).toEqual(["bob", "alice"]);
    expect(ids.slice(2).sort()).toEqual(["una", "unb"]);
  });
});
```

- [ ] **Step 2: Run the tests — they should fail**

Run: `npx jest __tests__/lib/all-tasks-query.test.ts`
Expected: every `sortTasks` test fails with `not implemented`. The `parseParams` tests still pass.

- [ ] **Step 3: Implement `sortTasks`**

Replace the throw-stub in `src/lib/all-tasks-query.ts`:

```ts
const PRIORITY_RANK: Record<"high" | "medium" | "low", number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function dueDateMs(d: Date | string | null): number | null {
  if (d === null) return null;
  return d instanceof Date ? d.getTime() : new Date(d).getTime();
}

export function sortTasks<T extends SortableTask>(tasks: T[], sort: SortKey, dir: SortDir): T[] {
  const out = [...tasks];
  const flip = dir === "desc" ? -1 : 1;

  out.sort((a, b) => {
    switch (sort) {
      case "title":
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) * flip;

      case "priority":
        return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * flip;

      case "dueDate": {
        const aMs = dueDateMs(a.dueDate);
        const bMs = dueDateMs(b.dueDate);
        // Nulls: last on asc, first on desc
        if (aMs === null && bMs === null) return 0;
        if (aMs === null) return dir === "asc" ? 1 : -1;
        if (bMs === null) return dir === "asc" ? -1 : 1;
        return (aMs - bMs) * flip;
      }

      case "owner": {
        const aName = a.assignedTo?.name ?? null;
        const bName = b.assignedTo?.name ?? null;
        // Nulls always grouped at end, regardless of dir
        if (aName === null && bName === null) return 0;
        if (aName === null) return 1;
        if (bName === null) return -1;
        return aName.localeCompare(bName, undefined, { sensitivity: "base" }) * flip;
      }
    }
  });

  return out;
}
```

- [ ] **Step 4: Run the tests — they should pass**

Run: `npx jest __tests__/lib/all-tasks-query.test.ts`
Expected: every test passes.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 6: Commit**

```bash
git add src/lib/all-tasks-query.ts __tests__/lib/all-tasks-query.test.ts
git commit -m "feat(all-tasks): implement sortTasks helper"
```

---

## Task 4: API route `GET /api/tasks/all`

**Files:**
- Create: `src/app/api/tasks/all/route.ts`

There are no existing API route tests in this repo (`find . -name "*.test.ts"` shows only `lib/` tests). The route's complex logic already lives in the helper and is unit-tested. The route itself is thin glue — verified by manual smoke in Task 8.

- [ ] **Step 1: Create the route**

```ts
// src/app/api/tasks/all/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireTeam, handleApiError } from "@/lib/session";
import { parseParams, sortTasks } from "@/lib/all-tasks-query";

export async function GET(request: NextRequest) {
  try {
    await requireSession();
    const teamId = await requireTeam();
    const { where, sort, dir } = parseParams(request.nextUrl.searchParams);

    const tasks = await prisma.task.findMany({
      where: {
        ...where,
        teamId,
        archivedAt: null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
        bucket: { select: { id: true, name: true, colorKey: true } },
      },
    });

    const shaped = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority as "high" | "medium" | "low",
      effortEstimate: t.effortEstimate as "small" | "medium" | "large",
      percentComplete: t.percentComplete,
      dueDate: t.dueDate,
      updatedAt: t.updatedAt,
      assignedTo: t.assignedTo,
      bucket: t.bucket,
    }));

    const sorted = sortTasks(shaped, sort, dir);

    return NextResponse.json({ tasks: sorted });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Smoke-check the route directly**

Start the dev server in a separate terminal: `npm run dev`. Then in a browser, log in to a team and visit:

```
http://localhost:3000/api/tasks/all
```

Expected: a JSON `{ tasks: [...] }` body containing only that team's non-`done`, non-`boulder`, non-archived tasks. If you have no session: HTTP 401. If you have no active team: HTTP 400 with `{ error: "No active team" }`.

Try a few query strings:
- `?status=in_progress` — only in-progress
- `?assignedTo=unassigned` — only backlog rows
- `?sort=title&dir=desc` — alphabetical reverse

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/all/route.ts
git commit -m "feat(all-tasks): add GET /api/tasks/all endpoint"
```

---

## Task 5: Page skeleton — fetch + render unsorted, unfiltered table

**Files:**
- Create: `src/app/all-tasks/page.tsx`

This task gets the page rendering. No filter UI yet, no sort UI yet, no status popup yet — just the table reading whatever `/api/tasks/all` returns with default params. Each subsequent task layers on one piece.

- [ ] **Step 1: Create the page**

```tsx
// src/app/all-tasks/page.tsx
"use client";

import Link from "next/link";
import useSWR from "swr";
import { ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { BucketBadge } from "@/components/buckets/bucket-badge";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "paused";

interface Row {
  id: string;
  title: string;
  status: TaskStatus;
  priority: "high" | "medium" | "low";
  dueDate: string | null;
  assignedTo: { id: string; name: string; avatarColor: string } | null;
  bucket: { id: string; name: string; colorKey: string } | null;
}

function formatDueDate(dateStr: string | null): { label: string; className: string } | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = (due.getTime() - now.getTime()) / 86400000;
  const formatted = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (diffDays < 0) return { label: `Overdue · ${formatted}`, className: "text-red-600 dark:text-red-400" };
  if (diffDays <= 2) return { label: `Due ${formatted}`, className: "text-amber-600 dark:text-amber-400" };
  return { label: `Due ${formatted}`, className: "text-muted-foreground" };
}

export default function AllTasksPage() {
  const { data, isLoading } = useSWR<{ tasks: Row[] }>("/api/tasks/all");
  const tasks = data?.tasks ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Tasks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Loading..." : `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-md bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ClipboardList className="size-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No tasks match your filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Bucket</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const due = formatDueDate(task.dueDate);
                  return (
                    <tr key={task.id} className="border-b last:border-b-0 hover:bg-accent/30 transition-colors">
                      <td className="px-3 py-2">
                        <Link href={`/tasks/${task.id}`} className="font-medium hover:text-primary hover:underline">
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        {task.assignedTo ? (
                          <span className="flex items-center gap-1.5">
                            <span
                              className="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                              style={{ backgroundColor: task.assignedTo.avatarColor }}
                            >
                              {task.assignedTo.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                            {task.assignedTo.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </td>
                      <td className={`px-3 py-2 ${due?.className ?? "text-muted-foreground"}`}>
                        {due?.label ?? "—"}
                      </td>
                      <td className="px-3 py-2"><PriorityBadge priority={task.priority} /></td>
                      <td className="px-3 py-2"><StatusBadge status={task.status} /></td>
                      <td className="px-3 py-2">
                        {task.bucket ? <BucketBadge name={task.bucket.name} colorKey={task.bucket.colorKey} /> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Smoke-check in the browser**

Start dev: `npm run dev`. Log into a team and visit `http://localhost:3000/all-tasks`.
Expected: subtitle shows the count, table renders with one row per active task. Empty state appears if none. Skeleton flashes during load.

- [ ] **Step 4: Commit**

```bash
git add src/app/all-tasks/page.tsx
git commit -m "feat(all-tasks): scaffold All Tasks page (table render, no filters/sort yet)"
```

---

## Task 6: Sortable column headers

**Files:**
- Modify: `src/app/all-tasks/page.tsx`

Sort state lives in the page; it becomes part of the SWR key, so `useSWR` automatically refetches on change.

- [ ] **Step 1: Add sort state and a sortable header button**

At the top of the file, add to imports:

```tsx
import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import type { SortKey, SortDir } from "@/lib/all-tasks-query";
```

Inside `AllTasksPage`, replace the existing `useSWR` call and add sort state:

```tsx
const [sort, setSort] = useState<SortKey>("dueDate");
const [dir, setDir] = useState<SortDir>("asc");

const params = new URLSearchParams();
params.set("sort", sort);
params.set("dir", dir);
const { data, isLoading } = useSWR<{ tasks: Row[] }>(`/api/tasks/all?${params.toString()}`);
```

Add a helper component above `AllTasksPage`:

```tsx
function SortHeader({
  label,
  column,
  sort,
  dir,
  onChange,
}: {
  label: string;
  column: SortKey;
  sort: SortKey;
  dir: SortDir;
  onChange: (sort: SortKey, dir: SortDir) => void;
}) {
  const active = sort === column;
  const next: SortDir = active && dir === "asc" ? "desc" : "asc";
  return (
    <button
      type="button"
      onClick={() => onChange(column, next)}
      className="inline-flex items-center gap-1 font-medium text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {active && (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
    </button>
  );
}
```

Replace the `<thead>` block:

```tsx
<thead className="sticky top-0 bg-card border-b">
  <tr className="text-left">
    <th className="px-3 py-2"><SortHeader label="Title" column="title" sort={sort} dir={dir} onChange={(s, d) => { setSort(s); setDir(d); }} /></th>
    <th className="px-3 py-2"><SortHeader label="Owner" column="owner" sort={sort} dir={dir} onChange={(s, d) => { setSort(s); setDir(d); }} /></th>
    <th className="px-3 py-2"><SortHeader label="Due" column="dueDate" sort={sort} dir={dir} onChange={(s, d) => { setSort(s); setDir(d); }} /></th>
    <th className="px-3 py-2"><SortHeader label="Priority" column="priority" sort={sort} dir={dir} onChange={(s, d) => { setSort(s); setDir(d); }} /></th>
    <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
    <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Bucket</th>
  </tr>
</thead>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Smoke-check sort UX**

Reload `/all-tasks`. Click "Title" — rows reorder A→Z, an ↑ icon appears. Click again — Z→A, icon flips to ↓. Click each of "Owner", "Due", "Priority". Verify each toggles asc/desc.

Specifically verify:
- Due asc: nulls at the bottom
- Due desc: nulls at the top
- Owner asc/desc: "Unassigned" always at the bottom

- [ ] **Step 4: Commit**

```bash
git add src/app/all-tasks/page.tsx
git commit -m "feat(all-tasks): add sortable column headers"
```

---

## Task 7: Filter bar — status / person / bucket

**Files:**
- Modify: `src/app/all-tasks/page.tsx`

- [ ] **Step 1: Add the filter UI**

Add to imports at the top of the file:

```tsx
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
```

Add type aliases above `AllTasksPage`:

```tsx
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "stalled", label: "Stalled" },
  { value: "paused", label: "Paused" },
];

interface TeamMember { id: string; name: string }
interface Bucket { id: string; name: string; colorKey: string }
```

Inside `AllTasksPage`, add filter state right after the sort state:

```tsx
const [statuses, setStatuses] = useState<TaskStatus[]>([]); // empty = no filter sent (server returns all five)
const [assignedTo, setAssignedTo] = useState(""); // "" | "unassigned" | <userId>
const [bucketId, setBucketId] = useState("");     // "" | "uncategorized" | <bucketId>

const { data: usersData } = useSWR<TeamMember[]>("/api/users");
const users = usersData ?? [];
const { data: bucketsData } = useSWR<{ buckets: Bucket[] }>("/api/buckets");
const buckets = bucketsData?.buckets ?? [];

const toggleStatus = (s: TaskStatus) =>
  setStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
```

Update the params builder to include filters:

```tsx
const params = new URLSearchParams();
params.set("sort", sort);
params.set("dir", dir);
statuses.forEach((s) => params.append("status", s));
if (assignedTo) params.set("assignedTo", assignedTo);
if (bucketId) params.set("bucketId", bucketId);
const { data, isLoading } = useSWR<{ tasks: Row[] }>(`/api/tasks/all?${params.toString()}`);
```

Add the filter card directly after the page header `<div>` (before the table `<Card>`):

```tsx
<Card>
  <CardContent className="pt-4 space-y-3">
    {/* Status chips */}
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">Status</Label>
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((opt) => {
          const active = statuses.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleStatus(opt.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>

    {/* Person + bucket dropdowns */}
    <div className="flex items-end gap-4 flex-wrap">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Person</Label>
        <select
          value={assignedTo}
          onChange={(e) => setAssignedTo(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-44"
        >
          <option value="">All</option>
          <option value="unassigned">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Bucket</Label>
        <select
          value={bucketId}
          onChange={(e) => setBucketId(e.target.value)}
          className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-44"
        >
          <option value="">All</option>
          <option value="uncategorized">Uncategorized</option>
          {buckets.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
    </div>
  </CardContent>
</Card>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Smoke-check the filters**

Reload `/all-tasks`. Verify:
- Clicking a status chip narrows results to that status; clicking again removes it; multiple chips combine (OR within status).
- "Person" dropdown narrows to one person; selecting "Unassigned" shows only backlog rows.
- "Bucket" dropdown narrows to one bucket; "Uncategorized" shows only bucketless rows.
- Filters compose with sort.
- Clearing all filters returns to the full list.

- [ ] **Step 4: Commit**

```bash
git add src/app/all-tasks/page.tsx
git commit -m "feat(all-tasks): add status/person/bucket filter bar"
```

---

## Task 8: Status popup — inline status change

**Files:**
- Modify: `src/app/all-tasks/page.tsx`

The popup posts to the existing `PATCH /api/tasks/[id]`. Server enforces `canEditTask`; we surface 403 as a toast.

- [ ] **Step 1: Wire the dropdown around the StatusBadge**

Add to imports:

```tsx
import { useSWRConfig } from "swr";
import { csrfFetch } from "@/lib/csrf-client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
```

Add status options including `done` above `AllTasksPage`:

```tsx
const POPUP_STATUSES: { value: TaskStatus | "done"; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "stalled", label: "Stalled" },
  { value: "paused", label: "Paused" },
  { value: "done", label: "Done" },
];
```

Inside `AllTasksPage`, build the SWR key once (so we can pass it to `mutate`):

```tsx
const swrKey = `/api/tasks/all?${params.toString()}`;
const { data, isLoading } = useSWR<{ tasks: Row[] }>(swrKey);

const { mutate } = useSWRConfig();

const handleStatusChange = async (taskId: string, status: TaskStatus | "done") => {
  try {
    const res = await csrfFetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.status === 403) {
      toast.error("You don't have permission to change this task.");
      return;
    }
    if (!res.ok) {
      toast.error("Failed to update status.");
      return;
    }
    mutate(swrKey);
    mutate("/api/tasks"); // keep My Tasks in sync if it's mounted
  } catch {
    toast.error("Failed to update status.");
  }
};
```

Replace the Status `<td>` in the row:

```tsx
<td className="px-3 py-2">
  <DropdownMenu>
    <DropdownMenuTrigger
      className="outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
      aria-label="Change status"
    >
      <StatusBadge status={task.status} />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      {POPUP_STATUSES.map((opt) => (
        <DropdownMenuItem
          key={opt.value}
          onClick={() => handleStatusChange(task.id, opt.value)}
          disabled={opt.value === task.status}
        >
          {opt.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
</td>
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Smoke-check the popup**

Reload `/all-tasks`.
- Click a status badge — dropdown opens with the six options; the current status is disabled.
- Pick a different status — the row updates, the badge reflects the change, and the change persists across reload.
- Pick "Done" — the row disappears (since `done` is excluded by the server's status filter). Open `/history` and verify the task appears there.
- Open `/tasks` (My Tasks) in another tab. Change the status of one of your own tasks from `/all-tasks` — verify it reflects in `/tasks` after SWR revalidation.
- Sign in as a non-manager and try to change the status of a task you don't own and that you weren't assigned — verify the toast "You don't have permission to change this task." appears and the row does not change. (Permission rules live in `src/lib/permissions.ts`'s `canEditTask`; consult it if needed to construct this case.)

- [ ] **Step 4: Commit**

```bash
git add src/app/all-tasks/page.tsx
git commit -m "feat(all-tasks): inline status popup writes via PATCH /api/tasks/[id]"
```

---

## Task 9: Header nav link

**Files:**
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Insert the new link between `/team` and `/history`**

Find this block (around line 33–38):

```tsx
const staffNavLinks = [
  { href: "/tasks", label: "My Tasks" },
  { href: "/team", label: "Team" },
  { href: "/history", label: "History" },
  { href: "/standup", label: "Standup" },
];
```

Replace with:

```tsx
const staffNavLinks = [
  { href: "/tasks", label: "My Tasks" },
  { href: "/team", label: "Team" },
  { href: "/all-tasks", label: "All Tasks" },
  { href: "/history", label: "History" },
  { href: "/standup", label: "Standup" },
];
```

No other changes — the mobile `allLinks` array is derived from `staffNavLinks`, so it picks up the new entry automatically.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Smoke-check the nav**

Reload any page. Verify:
- Desktop nav order is `My Tasks · Team · All Tasks · History · Standup`.
- Clicking "All Tasks" navigates to `/all-tasks` and the link shows the active highlight.
- On a narrow viewport, the mobile hamburger reveals the same five entries in the same order.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat(all-tasks): add 'All Tasks' to staff nav between Team and History"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all tests pass, including the new `all-tasks-query` cases.

- [ ] **Step 2: Run the type checker**

Run: `npx tsc --noEmit`
Expected: passes.

- [ ] **Step 3: Run the linter**

Run: `npm run lint`
Expected: passes (or only pre-existing warnings unrelated to this change).

- [ ] **Step 4: End-to-end smoke (browser)**

Start `npm run dev` and walk through the full flow on `/all-tasks`:

- Page loads with the active team's active tasks; subtitle count matches row count.
- Each column header sorts asc/desc with the correct null placement (Due nulls last on asc, first on desc; Owner nulls always at end).
- Filter bar: status chips toggle, person dropdown narrows, bucket dropdown narrows, all combinations compose.
- Status popup: changes a task's status in place; marking `done` removes the row and the task appears on `/history`.
- A status change made on `/all-tasks` is reflected on `/tasks` (My Tasks) for the same task after revalidation.
- Switching active team (via the user menu) refreshes the page with the new team's tasks; tasks from the other team are not visible.
- 403 path: a user without edit permission attempting a status change sees the toast and the row does not change.

- [ ] **Step 5: Final commit (if anything changed during smoke)**

If smoke testing found nothing to fix, no commit is needed — finish here.
