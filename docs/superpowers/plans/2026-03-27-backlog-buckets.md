# Backlog Buckets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow managers to define per-team buckets that categorize and group backlog tasks by work area.

**Architecture:** New `Bucket` model with per-team ownership. Tasks get an optional `bucketId` FK. The backlog page gains a filter tab bar and collapsible grouped sections. Bucket CRUD is manager-only; any team member can assign a bucket to a task.

**Tech Stack:** Prisma (PostgreSQL), Next.js App Router API routes, React (SWR), Tailwind CSS, shadcn/ui components.

**Spec:** `docs/superpowers/specs/2026-03-27-backlog-buckets-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/prisma/migrations/<timestamp>_add_buckets/migration.sql` | DB migration for Bucket table + Task.bucket_id |
| Modify | `src/prisma/schema.prisma` | Add Bucket model, update Task and Team models |
| Create | `src/lib/bucket-colors.ts` | Preset color palette mapping (color key -> Tailwind classes) |
| Create | `src/app/api/teams/[teamId]/buckets/route.ts` | GET (list) + POST (create) bucket endpoints |
| Create | `src/app/api/teams/[teamId]/buckets/[id]/route.ts` | PATCH (update) + DELETE bucket endpoints |
| Modify | `src/app/api/tasks/route.ts` | Accept `bucketId` on POST, include bucket in response |
| Modify | `src/app/api/tasks/[id]/route.ts` | Accept `bucketId` on PATCH, include bucket in GET/PATCH response |
| Modify | `src/app/api/backlog/route.ts` | Include bucket in response, support `?bucketId=` filter |
| Create | `src/components/buckets/bucket-badge.tsx` | Reusable color-dot + name badge component |
| Create | `src/components/buckets/bucket-filter-bar.tsx` | Filter tab bar for the backlog page |
| Create | `src/components/buckets/bucket-select.tsx` | Dropdown for selecting a bucket (used in task form) |
| Create | `src/components/buckets/manage-buckets-dialog.tsx` | Dialog for managers to CRUD bucket definitions |
| Modify | `src/components/backlog/backlog-list.tsx` | Group tasks by bucket, collapsible sections |
| Modify | `src/app/backlog/page.tsx` | Add filter bar, bucket state, grouped layout |
| Modify | `src/components/tasks/task-form.tsx` | Add optional bucket dropdown |
| Modify | `src/app/tasks/[id]/page.tsx` | Show bucket badge, pass bucketId to form |

---

### Task 1: Prisma Schema + Migration

**Files:**
- Modify: `src/prisma/schema.prisma`
- Create: `src/prisma/migrations/<timestamp>_add_buckets/migration.sql` (auto-generated)

- [ ] **Step 1: Add Bucket model and update Task/Team in schema.prisma**

In `src/prisma/schema.prisma`, add the Bucket model after the TeamMembership model (after line 107), and update Task and Team:

```prisma
model Bucket {
  id           String   @id @default(uuid())
  name         String
  colorKey     String   @map("color_key")
  displayOrder Int      @default(0) @map("display_order")
  teamId       String   @map("team_id")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  team  Team   @relation(fields: [teamId], references: [id])
  tasks Task[]

  @@unique([name, teamId])
  @@map("buckets")
}
```

In the `Team` model, add after `tasks Task[]` (line 91):
```prisma
  buckets     Bucket[]
```

In the `Task` model, add after `timeAllocation` (line 128):
```prisma
  bucketId       String?       @map("bucket_id")
  bucket         Bucket?       @relation(fields: [bucketId], references: [id], onDelete: SetNull)
```

- [ ] **Step 2: Generate and run the migration**

Run:
```bash
DATABASE_URL="postgresql://repan:repan_dev@localhost:5432/repan" npx prisma migrate dev --name add_buckets
```

Expected: Migration created and applied. New `buckets` table, new `bucket_id` column on `tasks`.

- [ ] **Step 3: Verify the migration applied**

Run:
```bash
DATABASE_URL="postgresql://repan:repan_dev@localhost:5432/repan" npx prisma migrate status
```

Expected: All migrations applied, no pending.

- [ ] **Step 4: Commit**

```bash
git add src/prisma/schema.prisma src/prisma/migrations/
git commit -m "feat: add Bucket model and Task.bucketId migration"
```

---

### Task 2: Bucket Color Palette

**Files:**
- Create: `src/lib/bucket-colors.ts`

- [ ] **Step 1: Create the color palette mapping**

Create `src/lib/bucket-colors.ts`:

```typescript
export type BucketColorKey =
  | "blue"
  | "purple"
  | "amber"
  | "teal"
  | "red"
  | "green"
  | "orange"
  | "pink"
  | "cyan";

interface BucketColorConfig {
  label: string;
  className: string;
  dotColor: string;
}

export const BUCKET_COLORS: Record<BucketColorKey, BucketColorConfig> = {
  blue: {
    label: "Blue",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
    dotColor: "bg-blue-500",
  },
  purple: {
    label: "Purple",
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
    dotColor: "bg-purple-500",
  },
  amber: {
    label: "Amber",
    className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800",
    dotColor: "bg-amber-500",
  },
  teal: {
    label: "Teal",
    className: "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800",
    dotColor: "bg-teal-500",
  },
  red: {
    label: "Red",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
    dotColor: "bg-red-500",
  },
  green: {
    label: "Green",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
    dotColor: "bg-green-500",
  },
  orange: {
    label: "Orange",
    className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
    dotColor: "bg-orange-500",
  },
  pink: {
    label: "Pink",
    className: "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-400 dark:border-pink-800",
    dotColor: "bg-pink-500",
  },
  cyan: {
    label: "Cyan",
    className: "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800",
    dotColor: "bg-cyan-500",
  },
};

export const VALID_COLOR_KEYS = Object.keys(BUCKET_COLORS) as BucketColorKey[];

export function isValidColorKey(key: string): key is BucketColorKey {
  return key in BUCKET_COLORS;
}
```

- [ ] **Step 2: Verify the file compiles**

Run:
```bash
npx tsc --noEmit src/lib/bucket-colors.ts 2>&1 || echo "checking via next build"
```

If tsc fails due to project config, verify with:
```bash
npm run build 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/bucket-colors.ts
git commit -m "feat: add bucket color palette mapping"
```

---

### Task 3: Bucket CRUD API Routes

**Files:**
- Create: `src/app/api/teams/[teamId]/buckets/route.ts`
- Create: `src/app/api/teams/[teamId]/buckets/[id]/route.ts`

- [ ] **Step 1: Create the list + create endpoint**

Create `src/app/api/teams/[teamId]/buckets/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager, handleApiError, requireTeam } from "@/lib/session";
import { isValidColorKey } from "@/lib/bucket-colors";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    await requireTeam();
    const { teamId } = await params;

    const buckets = await prisma.bucket.findMany({
      where: { teamId },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, colorKey: true, displayOrder: true },
    });

    return NextResponse.json({ buckets });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    await requireManager();
    const { teamId } = await params;
    const body = await request.json();

    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!body.colorKey || !isValidColorKey(body.colorKey)) {
      return NextResponse.json({ error: "Invalid color" }, { status: 400 });
    }

    // Auto-assign display order
    const maxOrder = await prisma.bucket.aggregate({
      where: { teamId },
      _max: { displayOrder: true },
    });
    const displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;

    const bucket = await prisma.bucket.create({
      data: { name, colorKey: body.colorKey, displayOrder, teamId },
      select: { id: true, name: true, colorKey: true, displayOrder: true },
    });

    return NextResponse.json(bucket, { status: 201 });
  } catch (error) {
    if ((error as any)?.code === "P2002") {
      return NextResponse.json({ error: "A bucket with that name already exists" }, { status: 409 });
    }
    return handleApiError(error);
  }
}
```

- [ ] **Step 2: Create the update + delete endpoint**

Create `src/app/api/teams/[teamId]/buckets/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager, handleApiError } from "@/lib/session";
import { isValidColorKey } from "@/lib/bucket-colors";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; id: string }> }
) {
  try {
    await requireManager();
    const { teamId, id } = await params;
    const body = await request.json();

    const bucket = await prisma.bucket.findUnique({ where: { id } });
    if (!bucket || bucket.teamId !== teamId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: any = {};
    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      data.name = name;
    }
    if (body.colorKey !== undefined) {
      if (!isValidColorKey(body.colorKey)) {
        return NextResponse.json({ error: "Invalid color" }, { status: 400 });
      }
      data.colorKey = body.colorKey;
    }
    if (body.displayOrder !== undefined) {
      data.displayOrder = body.displayOrder;
    }

    const updated = await prisma.bucket.update({
      where: { id },
      data,
      select: { id: true, name: true, colorKey: true, displayOrder: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if ((error as any)?.code === "P2002") {
      return NextResponse.json({ error: "A bucket with that name already exists" }, { status: 409 });
    }
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teamId: string; id: string }> }
) {
  try {
    await requireManager();
    const { teamId, id } = await params;

    const bucket = await prisma.bucket.findUnique({ where: { id } });
    if (!bucket || bucket.teamId !== teamId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.bucket.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 3: Verify routes compile**

Run:
```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no type errors in the new route files.

- [ ] **Step 4: Test the endpoints manually**

Start the dev server if not running: `npm run dev`

Create a bucket (replace `TEAM_ID` with an actual team ID from the DB):
```bash
curl -s -X POST http://localhost:3000/api/teams/TEAM_ID/buckets \
  -H "Content-Type: application/json" \
  -H "Cookie: repan_session=USER_ID; repan_team=TEAM_ID" \
  -d '{"name":"Mac","colorKey":"blue"}' | jq .
```

Expected: `201` response with `{ id, name: "Mac", colorKey: "blue", displayOrder: 0 }`.

List buckets:
```bash
curl -s http://localhost:3000/api/teams/TEAM_ID/buckets \
  -H "Cookie: repan_session=USER_ID; repan_team=TEAM_ID" | jq .
```

Expected: `{ buckets: [{ id, name: "Mac", colorKey: "blue", displayOrder: 0 }] }`.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/teams/\[teamId\]/buckets/
git commit -m "feat: add bucket CRUD API routes"
```

---

### Task 4: Update Task API to Support Buckets

**Files:**
- Modify: `src/app/api/tasks/route.ts`
- Modify: `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Update POST /api/tasks to accept bucketId**

In `src/app/api/tasks/route.ts`, modify the `prisma.task.create` call (line 72-90). Add `bucketId` to the `data` object and `bucket` to the `include`:

Change the `data` block to add after `teamId,` (line 84):
```typescript
        bucketId: body.bucketId || null,
```

Change the `include` block in both the `create` and the `findMany` to add:
```typescript
        bucket: { select: { id: true, name: true, colorKey: true } },
```

Specifically, in the `GET` handler's `prisma.task.findMany` (around line 40-46), add to the `include`:
```typescript
        bucket: { select: { id: true, name: true, colorKey: true } },
```

And in the `POST` handler's `prisma.task.create` (around line 86-89), add to the `include`:
```typescript
        bucket: { select: { id: true, name: true, colorKey: true } },
```

- [ ] **Step 2: Update PATCH/GET /api/tasks/[id] to support bucketId**

In `src/app/api/tasks/[id]/route.ts`:

In the `GET` handler's `include` (around line 15-18), add:
```typescript
        bucket: { select: { id: true, name: true, colorKey: true } },
```

In the `PATCH` handler, add after the `timeAllocation` handling (after line 81):
```typescript
    if (body.bucketId !== undefined) updateData.bucketId = body.bucketId || null;
```

In the `PATCH` handler's `prisma.task.update` `include` (around line 91-94), add:
```typescript
        bucket: { select: { id: true, name: true, colorKey: true } },
```

- [ ] **Step 3: Verify builds**

Run:
```bash
npm run build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/tasks/route.ts src/app/api/tasks/\[id\]/route.ts
git commit -m "feat: support bucketId in task create/update/read APIs"
```

---

### Task 5: Update Backlog API to Include Buckets

**Files:**
- Modify: `src/app/api/backlog/route.ts`

- [ ] **Step 1: Add bucket include and filter support**

In `src/app/api/backlog/route.ts`:

Add at the top of the `GET` handler, after `const teamId = await requireTeam();` (line 10), read the optional filter param. Since this is not a `NextRequest` with `nextUrl`, change the function signature:

Replace line 7:
```typescript
export async function GET(request: NextRequest) {
```

And add the import at the top:
```typescript
import { NextRequest, NextResponse } from "next/server";
```

(Replace the existing `import { NextResponse } from "next/server";` on line 1.)

After `const teamId = await requireTeam();` (line 10), add:
```typescript
  const bucketId = request.nextUrl.searchParams.get("bucketId");
```

Update the `prisma.task.findMany` `where` clause (line 13-14) to include optional bucket filter:
```typescript
    prisma.task.findMany({
      where: {
        assignedToId: null,
        archivedAt: null,
        teamId,
        ...(bucketId ? { bucketId } : {}),
      },
      include: {
        createdBy: { select: { id: true, name: true, avatarColor: true } },
        bucket: { select: { id: true, name: true, colorKey: true } },
      },
    }),
```

- [ ] **Step 2: Verify builds**

Run:
```bash
npm run build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/backlog/route.ts
git commit -m "feat: include bucket data in backlog API, support filtering"
```

---

### Task 6: Bucket Badge Component

**Files:**
- Create: `src/components/buckets/bucket-badge.tsx`

- [ ] **Step 1: Create the badge component**

Create `src/components/buckets/bucket-badge.tsx`:

```tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BUCKET_COLORS, type BucketColorKey } from "@/lib/bucket-colors";

interface BucketBadgeProps {
  name: string;
  colorKey: string;
  className?: string;
}

export function BucketBadge({ name, colorKey, className }: BucketBadgeProps) {
  const color = BUCKET_COLORS[colorKey as BucketColorKey];
  if (!color) return null;

  return (
    <Badge
      variant="outline"
      className={cn("border font-medium gap-1.5", color.className, className)}
    >
      <span className={cn("size-2 rounded-full shrink-0", color.dotColor)} />
      {name}
    </Badge>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/buckets/bucket-badge.tsx
git commit -m "feat: add BucketBadge component"
```

---

### Task 7: Bucket Select Dropdown

**Files:**
- Create: `src/components/buckets/bucket-select.tsx`

- [ ] **Step 1: Create the dropdown component**

Create `src/components/buckets/bucket-select.tsx`:

```tsx
"use client";

import useSWR from "swr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BUCKET_COLORS, type BucketColorKey } from "@/lib/bucket-colors";

interface Bucket {
  id: string;
  name: string;
  colorKey: string;
}

interface BucketSelectProps {
  teamId: string;
  value: string | null;
  onChange: (bucketId: string | null) => void;
}

const NONE_VALUE = "__none__";

export function BucketSelect({ teamId, value, onChange }: BucketSelectProps) {
  const { data } = useSWR<{ buckets: Bucket[] }>(
    teamId ? `/api/teams/${teamId}/buckets` : null
  );
  const buckets = data?.buckets ?? [];

  if (buckets.length === 0) return null;

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
    >
      <SelectTrigger>
        <SelectValue>
          {value
            ? buckets.find((b) => b.id === value)?.name ?? "Loading..."
            : "No bucket"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>No bucket</SelectItem>
        {buckets.map((bucket) => {
          const color = BUCKET_COLORS[bucket.colorKey as BucketColorKey];
          return (
            <SelectItem key={bucket.id} value={bucket.id}>
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-2 rounded-full shrink-0",
                    color?.dotColor ?? "bg-gray-400"
                  )}
                />
                {bucket.name}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/buckets/bucket-select.tsx
git commit -m "feat: add BucketSelect dropdown component"
```

---

### Task 8: Add Bucket to Task Form

**Files:**
- Modify: `src/components/tasks/task-form.tsx`
- Modify: `src/app/tasks/[id]/page.tsx`

- [ ] **Step 1: Add bucket state and dropdown to TaskForm**

In `src/components/tasks/task-form.tsx`:

Add import at the top (after line 16):
```typescript
import { BucketSelect } from "@/components/buckets/bucket-select";
```

Add to `TaskFormData` interface (after `blockerReason?: string;`, line 32):
```typescript
  bucketId?: string | null;
```

Add to `TaskFormInitialData` — it already extends `Partial<TaskFormData>`, so `bucketId` is included automatically.

Add a `teamId` prop to `TaskFormProps` (modify interface around line 46-50):
```typescript
interface TaskFormProps {
  mode: "create" | "edit";
  initialData?: TaskFormInitialData;
  onSubmit?: (data: TaskFormData) => void | Promise<void>;
  teamId?: string;
}
```

Update the destructure (line 75):
```typescript
export function TaskForm({ mode, initialData, onSubmit, teamId }: TaskFormProps) {
```

Add bucket state after the `timeAllocation` state (after line 92):
```typescript
  const [bucketId, setBucketId] = useState<string | null>(initialData?.bucketId ?? null);
```

Add `bucketId` to the auto-save `JSON.stringify` (around line 114-123), add to the object:
```typescript
          bucketId,
```

Add `bucketId` to the auto-save `useCallback` dependencies (line 133), add `bucketId`.

Add `bucketId` to the field-change `useEffect` dependencies (line 146), add `bucketId`.

Add sync in the `initialData` sync effect (around line 149-161), add:
```typescript
    if (initialData?.bucketId !== undefined) setBucketId(initialData.bucketId ?? null);
```

Add `bucketId` to the `formData` object in `handleSubmit` (around line 179-189):
```typescript
      bucketId,
```

Add the Bucket dropdown UI after the "Assigned To" section (after the manager-only block ending around line 400), before the submit section. Add it for all users (not gated by `isManager`):

```tsx
      {/* Bucket */}
      {teamId && (
        <div className="space-y-1.5">
          <Label>Bucket</Label>
          <BucketSelect teamId={teamId} value={bucketId} onChange={setBucketId} />
        </div>
      )}
```

- [ ] **Step 2: Pass teamId to TaskForm from the task detail page**

In `src/app/tasks/[id]/page.tsx`:

The task detail page needs to pass `teamId` to `TaskForm`. The task API already returns `teamId` on the task object (from Prisma). Add `teamId` to the `Task` interface (around line 29-44), add:
```typescript
  teamId: string;
```

Then pass it to `TaskForm` (around line 239):
```tsx
              <TaskForm
                mode="edit"
                initialData={initialData}
                onSubmit={handleFormSubmit}
                teamId={task.teamId}
              />
```

- [ ] **Step 3: Pass teamId from the create page**

In `src/app/tasks/new/page.tsx`, the `NewTaskForm` component renders `<TaskForm>` (line 62). We need to pass `teamId`. Since the active team is in an httpOnly cookie (not readable client-side), use the `/api/buckets` endpoint which returns `teamId` from the cookie.

Add import at the top:
```typescript
import useSWR from "swr";
```

Inside `NewTaskForm`, add after `const isBoulderType = ...` (line 14):
```typescript
  const { data: bucketsData } = useSWR<{ buckets: any[]; teamId: string }>("/api/buckets");
  const teamId = bucketsData?.teamId;
```

Update the `<TaskForm>` call (line 62-65) to pass teamId:
```tsx
          <TaskForm
            mode="create"
            initialData={isBoulderType ? { status: "boulder" } : undefined}
            onSubmit={handleSubmit}
            teamId={teamId}
          />
```

- [ ] **Step 4: Add bucketId to initialData in task detail page**

In `src/app/tasks/[id]/page.tsx`, in the `initialData` object (around line 138-149), add:
```typescript
    bucketId: task.bucket?.id ?? null,
```

Also add `bucket` to the `Task` interface:
```typescript
  bucket: { id: string; name: string; colorKey: string } | null;
```

- [ ] **Step 5: Verify builds**

Run:
```bash
npm run build 2>&1 | tail -30
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/tasks/task-form.tsx src/app/tasks/\[id\]/page.tsx src/app/tasks/new/page.tsx
git commit -m "feat: add bucket dropdown to task create/edit forms"
```

---

### Task 9: Bucket Filter Bar Component

**Files:**
- Create: `src/components/buckets/bucket-filter-bar.tsx`

- [ ] **Step 1: Create the filter bar**

Create `src/components/buckets/bucket-filter-bar.tsx`:

```tsx
"use client";

import { cn } from "@/lib/utils";
import { BUCKET_COLORS, type BucketColorKey } from "@/lib/bucket-colors";

interface Bucket {
  id: string;
  name: string;
  colorKey: string;
}

interface BucketFilterBarProps {
  buckets: Bucket[];
  selected: string | null; // null = "All"
  onSelect: (bucketId: string | null) => void;
  uncategorizedCount: number;
}

export function BucketFilterBar({
  buckets,
  selected,
  onSelect,
  uncategorizedCount,
}: BucketFilterBarProps) {
  if (buckets.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* All tab */}
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
          selected === null
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80"
        )}
      >
        All
      </button>

      {/* Uncategorized tab */}
      {uncategorizedCount > 0 && (
        <button
          onClick={() => onSelect("uncategorized")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1.5",
            selected === "uncategorized"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80"
          )}
        >
          <span className="size-2 rounded-full bg-gray-400 shrink-0" />
          Uncategorized
        </button>
      )}

      {/* Bucket tabs */}
      {buckets.map((bucket) => {
        const color = BUCKET_COLORS[bucket.colorKey as BucketColorKey];
        return (
          <button
            key={bucket.id}
            onClick={() => onSelect(bucket.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1.5",
              selected === bucket.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80"
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                selected === bucket.id ? "bg-current" : (color?.dotColor ?? "bg-gray-400")
              )}
            />
            {bucket.name}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/buckets/bucket-filter-bar.tsx
git commit -m "feat: add BucketFilterBar component"
```

---

### Task 10: Grouped Backlog List

**Files:**
- Modify: `src/components/backlog/backlog-list.tsx`

- [ ] **Step 1: Add bucket info to the BacklogTask interface**

In `src/components/backlog/backlog-list.tsx`, update the `BacklogTask` interface (around lines 23-32) to add:

```typescript
  bucket: { id: string; name: string; colorKey: string } | null;
```

- [ ] **Step 2: Add grouping logic and collapsible sections**

Add imports at the top:
```typescript
import { ChevronDown, ChevronRight } from "lucide-react";
import { BUCKET_COLORS, type BucketColorKey } from "@/lib/bucket-colors";
```

Add a `groupBy` prop to `BacklogListProps`:
```typescript
interface BacklogListProps {
  tasks: BacklogTask[];
  onMutate: () => void;
  groupByBucket?: boolean;
}
```

Update the component signature:
```typescript
export function BacklogList({ tasks, onMutate, groupByBucket = false }: BacklogListProps) {
```

Add collapsed state after the existing state declarations (after line 61):
```typescript
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };
```

Replace the return JSX. When `groupByBucket` is true, group the tasks. When false, render the existing flat list. The grouped view renders:
1. Uncategorized group first (tasks where `bucket` is null)
2. Then each bucket group ordered by the bucket's name

The task row rendering stays the same — extract it into a helper function `renderTaskRow` to avoid duplication.

The full refactored component will:
- Extract the per-task row into a local `TaskRow` component
- When `groupByBucket` is false, render flat list as before
- When `groupByBucket` is true, group tasks and render collapsible sections with color-coded headers

Here's the grouping logic to add before the return:

```typescript
  const groupedTasks = groupByBucket
    ? (() => {
        const uncategorized = localTasks.filter((t) => !t.bucket);
        const byBucket = new Map<string, { bucket: BacklogTask["bucket"]; tasks: BacklogTask[] }>();
        for (const task of localTasks) {
          if (!task.bucket) continue;
          const existing = byBucket.get(task.bucket.id);
          if (existing) {
            existing.tasks.push(task);
          } else {
            byBucket.set(task.bucket.id, { bucket: task.bucket, tasks: [task] });
          }
        }
        const groups: { id: string; name: string; colorKey: string | null; tasks: BacklogTask[] }[] = [];
        if (uncategorized.length > 0) {
          groups.push({ id: "uncategorized", name: "Uncategorized", colorKey: null, tasks: uncategorized });
        }
        for (const [bucketId, { bucket, tasks: bucketTasks }] of byBucket) {
          groups.push({ id: bucketId, name: bucket!.name, colorKey: bucket!.colorKey, tasks: bucketTasks });
        }
        return groups;
      })()
    : null;
```

For the grouped view JSX, render each group as a collapsible section:

```tsx
  if (groupByBucket && groupedTasks) {
    return (
      <div className="space-y-4">
        {groupedTasks.map((group) => {
          const isCollapsed = collapsedGroups.has(group.id);
          const color = group.colorKey ? BUCKET_COLORS[group.colorKey as BucketColorKey] : null;
          return (
            <div key={group.id}>
              <button
                onClick={() => toggleGroup(group.id)}
                className="flex items-center gap-2 w-full py-1.5 text-left"
              >
                {isCollapsed ? (
                  <ChevronRight className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "size-2.5 rounded-full shrink-0",
                    color?.dotColor ?? "bg-gray-400"
                  )}
                />
                <span className="text-sm font-semibold">{group.name}</span>
                <span className="text-xs text-muted-foreground">
                  {group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}
                </span>
              </button>
              {!isCollapsed && (
                <div className="space-y-2 pl-4 mt-1">
                  {group.tasks.map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      index={index}
                      isClaiming={claimingId === task.id}
                      isClaimed={claimedId === task.id}
                      onClaim={handleClaim}
                      showClaim={!!user}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
```

Extract the existing task row markup into a `TaskRow` component defined at the bottom of the file (or above `BacklogList`):

```tsx
function TaskRow({
  task,
  index,
  isClaiming,
  isClaimed,
  onClaim,
  showClaim,
}: {
  task: BacklogTask;
  index: number;
  isClaiming: boolean;
  isClaimed: boolean;
  onClaim: (id: string) => void;
  showClaim: boolean;
}) {
  const effort = effortConfig[task.effortEstimate] ?? effortConfig.medium;

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all duration-200",
        "hover:shadow-sm hover:border-border/80"
      )}
      style={
        isClaimed
          ? {
              transform: "translateY(-80px) scale(0.95)",
              opacity: 0,
              transition: "all 500ms cubic-bezier(0.4, 0, 0.2, 1)",
              background: "rgba(139, 92, 246, 0.15)",
              borderColor: "rgba(139, 92, 246, 0.4)",
            }
          : undefined
      }
    >
      <span className="flex-none w-6 text-center text-xs font-medium tabular-nums text-muted-foreground/60">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <Link
          href={`/tasks/${task.id}`}
          className="text-sm font-medium leading-snug line-clamp-2 hover:text-primary hover:underline transition-colors"
        >
          {task.title}
        </Link>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          by {task.createdBy.name}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        <PriorityBadge priority={task.priority} />
        <Badge
          variant="outline"
          className={cn("text-xs font-semibold border", effort.className)}
          title={`Effort: ${task.effortEstimate}`}
        >
          {effort.label}
        </Badge>
        {task.forecast && (
          <ForecastBadge weeksToStart={task.forecast.weeksToStart} />
        )}
      </div>
      {showClaim && (
        <Button
          size="sm"
          variant="default"
          className="h-8 gap-1.5 text-xs ml-2 shrink-0"
          onClick={() => onClaim(task.id)}
          disabled={isClaiming}
        >
          {isClaiming ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle className="size-3.5" />
          )}
          Claim
        </Button>
      )}
    </div>
  );
}
```

Update the flat list view to also use `TaskRow` for DRY:

```tsx
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground pb-1">
        Sorted by urgency — highest priority and closest deadlines first
      </p>
      {localTasks.map((task, index) => (
        <TaskRow
          key={task.id}
          task={task}
          index={index}
          isClaiming={claimingId === task.id}
          isClaimed={claimedId === task.id}
          onClaim={handleClaim}
          showClaim={!!user}
        />
      ))}
    </div>
  );
```

- [ ] **Step 3: Verify builds**

Run:
```bash
npm run build 2>&1 | tail -30
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/backlog/backlog-list.tsx
git commit -m "feat: add grouped-by-bucket view to backlog list"
```

---

### Task 11: Update Backlog Page with Filter Bar and Grouping

**Files:**
- Modify: `src/app/backlog/page.tsx`

- [ ] **Step 1: Add bucket state, fetch, and filter bar**

In `src/app/backlog/page.tsx`:

Add imports:
```typescript
import useSWR from "swr";
import { BucketFilterBar } from "@/components/buckets/bucket-filter-bar";
```

Add `bucket` to the `BacklogTask` interface:
```typescript
  bucket: { id: string; name: string; colorKey: string } | null;
```

Inside `BacklogPage`, add state and bucket fetch after the existing `useSWR`:

```typescript
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const { data: bucketsData } = useSWR<{ buckets: { id: string; name: string; colorKey: string }[] }>(
    "/api/teams/" + "TEAM_ID" + "/buckets"
  );
```

Wait — the backlog page doesn't have the teamId. The backlog API uses a server-side cookie, but the buckets API needs teamId in the URL. We have two options:
1. Add a client-side team context/hook
2. Create a convenience `/api/buckets` route that reads the team from the cookie

Option 2 is simpler and consistent with the existing `/api/backlog` pattern. Create a thin wrapper route.

Add a new file `src/app/api/buckets/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";

export async function GET() {
  try {
    await requireSession();
    const teamId = await requireTeam();

    const buckets = await prisma.bucket.findMany({
      where: { teamId },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, colorKey: true, displayOrder: true },
    });

    return NextResponse.json({ buckets });
  } catch (error) {
    return handleApiError(error);
  }
}
```

Now in `src/app/backlog/page.tsx`, the bucket fetch becomes:

```typescript
  const { data: bucketsData } = useSWR<{ buckets: { id: string; name: string; colorKey: string }[] }>(
    "/api/buckets"
  );
  const buckets = bucketsData?.buckets ?? [];
```

Add `useState` import (already imported from `"swr"`, but need `useState` from React):
```typescript
import { useState } from "react";
```

Add filter state:
```typescript
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
```

Compute filtered tasks and uncategorized count:
```typescript
  const uncategorizedCount = tasks.filter((t) => !t.bucket).length;

  const filteredTasks =
    selectedBucket === null
      ? tasks
      : selectedBucket === "uncategorized"
        ? tasks.filter((t) => !t.bucket)
        : tasks.filter((t) => t.bucket?.id === selectedBucket);

  const showGrouped = selectedBucket === null && buckets.length > 0;
```

Add the filter bar in the JSX, between the summary bar and the backlog list (after the `BacklogSummary` section, before the backlog list section):

```tsx
      {/* Bucket filter bar */}
      {buckets.length > 0 && (
        <BucketFilterBar
          buckets={buckets}
          selected={selectedBucket}
          onSelect={setSelectedBucket}
          uncategorizedCount={uncategorizedCount}
        />
      )}
```

Update the `BacklogList` usage to pass filtered tasks and grouping flag:
```tsx
        <BacklogList tasks={filteredTasks} onMutate={() => mutate()} groupByBucket={showGrouped} />
```

Also update the empty state check and count to use `filteredTasks`:
```tsx
      {isLoading ? (
        ...loading skeleton...
      ) : filteredTasks.length === 0 ? (
        ...empty state...
      ) : (
        <BacklogList tasks={filteredTasks} onMutate={() => mutate()} groupByBucket={showGrouped} />
      )}
```

Update the task count in the header to still show total:
```tsx
            : `${tasks.length} unclaimed task${tasks.length !== 1 ? "s" : ""} in the queue`}
```

- [ ] **Step 2: Widen the backlog page**

The backlog page currently uses `max-w-4xl`. Update it to `max-w-7xl` to match the other pages (same change as Team/Tasks):

```tsx
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
```

- [ ] **Step 3: Verify builds**

Run:
```bash
npm run build 2>&1 | tail -30
```

Expected: No errors.

- [ ] **Step 4: Test in browser**

1. Open http://localhost:3000/backlog
2. If no buckets exist yet, the filter bar should not appear
3. Create buckets via the API (curl) and refresh — filter bar should appear
4. Assign some tasks to buckets via the API, refresh — grouped view should show

- [ ] **Step 5: Commit**

```bash
git add src/app/backlog/page.tsx src/app/api/buckets/route.ts
git commit -m "feat: add bucket filter bar and grouped view to backlog page"
```

---

### Task 12: Manage Buckets Dialog

**Files:**
- Create: `src/components/buckets/manage-buckets-dialog.tsx`
- Modify: `src/app/backlog/page.tsx`

- [ ] **Step 1: Create the manage buckets dialog**

Create `src/components/buckets/manage-buckets-dialog.tsx`:

```tsx
"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  BUCKET_COLORS,
  VALID_COLOR_KEYS,
  type BucketColorKey,
} from "@/lib/bucket-colors";
import { toast } from "sonner";

interface Bucket {
  id: string;
  name: string;
  colorKey: string;
  displayOrder: number;
}

interface ManageBucketsDialogProps {
  teamId: string;
  onMutate: () => void;
}

export function ManageBucketsDialog({ teamId, onMutate }: ManageBucketsDialogProps) {
  const { data, mutate: mutateBuckets } = useSWR<{ buckets: Bucket[] }>(
    `/api/teams/${teamId}/buckets`
  );
  const buckets = data?.buckets ?? [];

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<BucketColorKey>("blue");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<BucketColorKey>("blue");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/buckets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), colorKey: newColor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create bucket");
      }
      setNewName("");
      mutateBuckets();
      onMutate();
      toast.success("Bucket created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setIsAdding(false);
    }
  };

  const startEditing = (bucket: Bucket) => {
    setEditingId(bucket.id);
    setEditName(bucket.name);
    setEditColor(bucket.colorKey as BucketColorKey);
  };

  const handleSaveEdit = async (bucketId: string) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/buckets/${bucketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), colorKey: editColor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update");
      }
      setEditingId(null);
      mutateBuckets();
      onMutate();
      toast.success("Bucket updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDelete = async (bucket: Bucket) => {
    if (!confirm(`Delete "${bucket.name}"? Tasks in this bucket will become uncategorized.`)) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/buckets/${bucket.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      mutateBuckets();
      onMutate();
      toast.success("Bucket deleted");
    } catch {
      toast.error("Failed to delete bucket");
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="size-3.5" />
          Manage Buckets
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Buckets</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Existing buckets */}
          {buckets.length > 0 && (
            <div className="space-y-2">
              {buckets.map((bucket) => {
                const color = BUCKET_COLORS[bucket.colorKey as BucketColorKey];
                const isEditing = editingId === bucket.id;
                return (
                  <div
                    key={bucket.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border"
                  >
                    {isEditing ? (
                      <>
                        <div className="flex gap-1">
                          {VALID_COLOR_KEYS.map((key) => (
                            <button
                              key={key}
                              onClick={() => setEditColor(key)}
                              className={cn(
                                "size-4 rounded-full",
                                BUCKET_COLORS[key].dotColor,
                                editColor === key ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
                              )}
                            />
                          ))}
                        </div>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(bucket.id)}
                          className="h-7 text-sm flex-1"
                          autoFocus
                        />
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleSaveEdit(bucket.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className={cn("size-3 rounded-full shrink-0", color?.dotColor ?? "bg-gray-400")} />
                        <button
                          className="text-sm font-medium flex-1 text-left hover:underline"
                          onClick={() => startEditing(bucket)}
                        >
                          {bucket.name}
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(bucket)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new bucket */}
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-sm font-medium">Add bucket</p>
            <div className="flex gap-2">
              <Input
                placeholder="Bucket name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="flex-1"
              />
              <Button onClick={handleAdd} disabled={isAdding || !newName.trim()} size="sm">
                Add
              </Button>
            </div>
            {/* Color picker */}
            <div className="flex gap-1.5 flex-wrap">
              {VALID_COLOR_KEYS.map((key) => {
                const color = BUCKET_COLORS[key];
                return (
                  <button
                    key={key}
                    onClick={() => setNewColor(key)}
                    className={cn(
                      "size-6 rounded-full transition-all",
                      color.dotColor,
                      newColor === key
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:scale-110"
                    )}
                    title={color.label}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Add the manage button to the backlog page**

In `src/app/backlog/page.tsx`, add import:
```typescript
import { ManageBucketsDialog } from "@/components/buckets/manage-buckets-dialog";
import { useUser } from "@/components/user-context";
```

Get the user and determine if they're a manager:
```typescript
  const { user } = useUser();
  const isManager = user?.role === "manager";
```

The backlog page needs the `teamId` for the manage dialog. Since we added `/api/buckets` as a convenience, but the manage dialog needs `teamId` for the CRUD routes, we need to get it. Add a lightweight fetch. The simplest approach: add a `/api/me` or read from the existing teams API. Actually, let's just include `teamId` in the `/api/buckets` response.

Update `src/app/api/buckets/route.ts` to include teamId:
```typescript
    return NextResponse.json({ buckets, teamId });
```

Then in the backlog page:
```typescript
  const { data: bucketsData, mutate: mutateBuckets } = useSWR<{
    buckets: { id: string; name: string; colorKey: string }[];
    teamId: string;
  }>("/api/buckets");
  const buckets = bucketsData?.buckets ?? [];
  const teamId = bucketsData?.teamId;
```

Add the manage button next to the page header. Update the header section to be a flex row:
```tsx
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backlog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading..."
              : `${tasks.length} unclaimed task${tasks.length !== 1 ? "s" : ""} in the queue`}
          </p>
        </div>
        {isManager && teamId && (
          <ManageBucketsDialog teamId={teamId} onMutate={() => { mutateBuckets(); mutate(); }} />
        )}
      </div>
```

- [ ] **Step 3: Verify builds**

Run:
```bash
npm run build 2>&1 | tail -30
```

Expected: No errors.

- [ ] **Step 4: Test in browser**

1. Log in as Sarah Chen (manager)
2. Go to /backlog
3. Click "Manage Buckets"
4. Add "Mac" (blue), "Windows" (purple), "Packaging" (amber)
5. Verify they appear in the dialog and filter bar
6. Delete one and verify it's removed

- [ ] **Step 5: Commit**

```bash
git add src/components/buckets/manage-buckets-dialog.tsx src/app/backlog/page.tsx src/app/api/buckets/route.ts
git commit -m "feat: add manage buckets dialog for managers on backlog page"
```

---

### Task 13: Show Bucket Badge on Task Detail Page

**Files:**
- Modify: `src/app/tasks/[id]/page.tsx`

- [ ] **Step 1: Add bucket badge to the header**

In `src/app/tasks/[id]/page.tsx`, add import:
```typescript
import { BucketBadge } from "@/components/buckets/bucket-badge";
```

In the header badges area (around line 175-178), add the bucket badge after PriorityBadge:
```tsx
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.bucket && (
              <BucketBadge name={task.bucket.name} colorKey={task.bucket.colorKey} />
            )}
          </div>
```

- [ ] **Step 2: Verify builds**

Run:
```bash
npm run build 2>&1 | tail -30
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/tasks/\[id\]/page.tsx
git commit -m "feat: show bucket badge on task detail page"
```

---

### Task 14: End-to-End Manual Testing

- [ ] **Step 1: Verify full flow**

Test the complete flow in the browser:

1. **Login** as Sarah Chen (manager) at http://localhost:3000
2. **Create buckets**: Go to /backlog, click "Manage Buckets", create Mac (blue), Windows (purple), Packaging (amber)
3. **Verify filter bar**: Filter bar should show All, Uncategorized, Mac, Windows, Packaging
4. **Create a task with bucket**: Go to /tasks/new, fill in a task, select "Mac" from the Bucket dropdown, submit
5. **Verify grouped view**: Go to /backlog — the task should appear under the Mac group. Other tasks should be in Uncategorized (at the top)
6. **Filter**: Click "Mac" tab — only Mac tasks shown. Click "All" — grouped view returns
7. **Edit bucket on task**: Go to a task detail page, change its bucket via the dropdown, verify it auto-saves
8. **Bucket badge**: Verify the bucket badge appears on the task detail header
9. **Staff user**: Log out, log in as Marcus Rivera (staff), verify:
   - Can see buckets and filter bar on backlog
   - Can assign/change bucket on tasks
   - Cannot see "Manage Buckets" button
10. **Delete bucket**: Log back in as Sarah, delete a bucket, verify tasks move to Uncategorized

- [ ] **Step 2: Fix any issues found**

Address any bugs found during testing.

- [ ] **Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues from manual testing of backlog buckets"
```
