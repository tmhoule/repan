# Per-Team Priority Weights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each team manager configure task priority weights (high/medium/low) that drive workload calculations across dashboard and capacity views.

**Architecture:** Add three integer columns (`weightHigh`, `weightMedium`, `weightLow`) to the existing `Team` model with defaults 60/35/10. Replace all three hardcoded weight usages with DB-sourced values. Add a settings UI in the existing Admin > Settings > System Settings placeholder.

**Tech Stack:** Prisma (migration), Next.js API routes, React + SWR + shadcn/ui

---

### Task 1: Add weight columns to Team schema + migrate

**Files:**
- Modify: `src/prisma/schema.prisma:86-97` (Team model)
- Create: migration file (auto-generated)

- [ ] **Step 1: Add columns to Prisma schema**

In `src/prisma/schema.prisma`, add three fields to the `Team` model after `createdAt`:

```prisma
  weightHigh   Int      @default(60) @map("weight_high")
  weightMedium Int      @default(35) @map("weight_medium")
  weightLow    Int      @default(10) @map("weight_low")
```

The full Team model should look like:
```prisma
model Team {
  id           String   @id @default(uuid())
  name         String   @unique
  createdAt    DateTime @default(now()) @map("created_at")
  weightHigh   Int      @default(60) @map("weight_high")
  weightMedium Int      @default(35) @map("weight_medium")
  weightLow    Int      @default(10) @map("weight_low")

  memberships TeamMembership[]
  tasks       Task[]
  buckets     Bucket[]
  todos       Todo[]

  @@map("teams")
}
```

- [ ] **Step 2: Generate and run migration**

```bash
npx prisma migrate dev --name add-team-priority-weights
```

Expected: Migration succeeds. Existing teams get default values 60/35/10.

- [ ] **Step 3: Verify migration**

```bash
npx prisma studio
```

Or run:
```bash
npx prisma db execute --stdin <<< "SELECT id, name, weight_high, weight_medium, weight_low FROM teams LIMIT 5;"
```

Expected: All existing teams show 60, 35, 10.

- [ ] **Step 4: Commit**

```bash
git add src/prisma/schema.prisma src/prisma/migrations/
git commit -m "feat: add priority weight columns to Team model"
```

---

### Task 2: Update capacity API to use team weights

**Files:**
- Modify: `src/app/api/capacity/route.ts`

- [ ] **Step 1: Fetch team with weights**

In `src/app/api/capacity/route.ts`, after line 8 (`const teamId = await requireTeam();`), fetch the team record:

```typescript
const team = await prisma.team.findUniqueOrThrow({
  where: { id: teamId },
  select: { weightHigh: true, weightMedium: true, weightLow: true },
});
```

- [ ] **Step 2: Replace hardcoded weights in calcLoad**

Change the `calcLoad` function (currently at line 75-82) from:

```typescript
const calcLoad = (tasks: typeof userTasks) => {
  return tasks.reduce((sum, t) => {
    const weight = t.priority === "high" ? 60 : t.priority === "medium" ? 35 : 10;
    // Reduce weight by percent complete
    const remaining = 1 - (t.percentComplete ?? 0) / 100;
    return sum + Math.round(weight * remaining);
  }, 0);
};
```

To:

```typescript
const calcLoad = (tasks: typeof userTasks) => {
  return tasks.reduce((sum, t) => {
    const weight = t.priority === "high" ? team.weightHigh : t.priority === "medium" ? team.weightMedium : team.weightLow;
    const remaining = 1 - (t.percentComplete ?? 0) / 100;
    return sum + Math.round(weight * remaining);
  }, 0);
};
```

- [ ] **Step 3: Verify the app builds**

```bash
npx next build 2>&1 | tail -20
```

Expected: No type errors related to team weights.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/capacity/route.ts
git commit -m "feat: use team-specific priority weights in capacity API"
```

---

### Task 3: Update dashboard API to use team weights

**Files:**
- Modify: `src/app/api/dashboard/route.ts`

- [ ] **Step 1: Fetch team with weights**

In `src/app/api/dashboard/route.ts`, after line 11 (`const teamId = await requireTeam();`), add:

```typescript
const team = await prisma.team.findUniqueOrThrow({
  where: { id: teamId },
  select: { weightHigh: true, weightMedium: true, weightLow: true },
});
```

- [ ] **Step 2: Replace hardcoded weights in current workload calculation**

Change lines 60-62 from:

```typescript
const currentHigh = userTasks.filter(t => t.priority === "high").length * 60;
const currentMed = userTasks.filter(t => t.priority === "medium").length * 35;
const currentLow = userTasks.filter(t => t.priority === "low").length * 10;
```

To:

```typescript
const currentHigh = userTasks.filter(t => t.priority === "high").length * team.weightHigh;
const currentMed = userTasks.filter(t => t.priority === "medium").length * team.weightMedium;
const currentLow = userTasks.filter(t => t.priority === "low").length * team.weightLow;
```

- [ ] **Step 3: Replace hardcoded weights in 30-day rolling average loop**

Change line 79 from:

```typescript
dayLoad += t.priority === "high" ? 60 : t.priority === "medium" ? 35 : 10;
```

To:

```typescript
dayLoad += t.priority === "high" ? team.weightHigh : t.priority === "medium" ? team.weightMedium : team.weightLow;
```

- [ ] **Step 4: Include weights in the API response**

At the end of the response JSON (line 180), add `priorityWeights` to the return so the frontend workload chart can use them:

Change:
```typescript
return NextResponse.json({ workload, atRisk, keyProjects, backlogHealth: health, weeklyThroughput: weeklyData, recentActivity, recentBadges });
```

To:
```typescript
return NextResponse.json({ workload, atRisk, keyProjects, backlogHealth: health, weeklyThroughput: weeklyData, recentActivity, recentBadges, priorityWeights: { high: team.weightHigh, medium: team.weightMedium, low: team.weightLow } });
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/dashboard/route.ts
git commit -m "feat: use team-specific priority weights in dashboard API"
```

---

### Task 4: Update WorkloadChart to use dynamic weights

**Files:**
- Modify: `src/components/dashboard/workload-chart.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add weights prop to WorkloadChartProps**

In `src/components/dashboard/workload-chart.tsx`, change the interface and remove the hardcoded constant:

Remove line 20:
```typescript
const TIME_WEIGHTS: Record<string, number> = { high: 60, medium: 35, low: 10 };
```

Change the interface at line 16-18 from:
```typescript
interface WorkloadChartProps {
  data: WorkloadUser[];
}
```

To:
```typescript
interface WorkloadChartProps {
  data: WorkloadUser[];
  priorityWeights?: { high: number; medium: number; low: number };
}
```

- [ ] **Step 2: Use weights prop in the component**

Change the component signature at line 186 from:
```typescript
export function WorkloadChart({ data }: WorkloadChartProps) {
```

To:
```typescript
export function WorkloadChart({ data, priorityWeights }: WorkloadChartProps) {
  const TIME_WEIGHTS = priorityWeights ?? { high: 60, medium: 35, low: 10 };
```

- [ ] **Step 3: Update SEGMENTS labels to use dynamic weights**

Change the `SEGMENTS` constant (lines 24-29) from a module-level const to inside the component, after the `TIME_WEIGHTS` line:

Remove the module-level `SEGMENTS` constant and add inside the component body (after the `TIME_WEIGHTS` line):

```typescript
const SEGMENTS = [
  { key: "boulder", label: "Boulder", color: "#8B5CF6" },
  { key: "high", label: `High (${TIME_WEIGHTS.high}%)`, color: "#dc2626" },
  { key: "medium", label: `Med (${TIME_WEIGHTS.medium}%)`, color: "#f59e0b" },
  { key: "low", label: `Low (${TIME_WEIGHTS.low}%)`, color: "#166534" },
] as const;
```

- [ ] **Step 4: Update tooltip to use dynamic weights**

In the `WorkloadTooltip` component, it references `TIME_WEIGHTS` on line 65. This is already fine since `TIME_WEIGHTS` will now be defined at the `WorkloadChart` level. However, `WorkloadTooltip` is a separate function. The simplest fix: make `WorkloadTooltip` accept a `weights` prop.

Add `weights` to the `WorkloadTooltip` params:
```typescript
function WorkloadTooltip({
  user,
  tasks,
  boulders,
  total,
  avg30d,
  weights,
}: {
  user: string;
  tasks: Array<{ title: string; priority: string }>;
  boulders: Array<{ title: string; timeAllocation: number }>;
  total: number;
  avg30d: number;
  weights: Record<string, number>;
}) {
```

Change line 65 from:
```typescript
<span className="text-muted-foreground shrink-0">{TIME_WEIGHTS[priority]}%</span>
```
To:
```typescript
<span className="text-muted-foreground shrink-0">{weights[priority]}%</span>
```

Then in `WorkloadRow`, also add and pass through `weights`:

Add `weights` to `WorkloadRow` props:
```typescript
function WorkloadRow({
  user,
  segments,
  total,
  avg30d,
  maxValue,
  tasks,
  boulders,
  isNearTop,
  weights,
}: {
  user: WorkloadUser["user"];
  segments: Array<{ color: string; value: number }>;
  total: number;
  avg30d: number;
  maxValue: number;
  tasks: Array<{ title: string; priority: string }>;
  boulders: Array<{ title: string; timeAllocation: number }>;
  isNearTop: boolean;
  weights: Record<string, number>;
}) {
```

Pass `weights` to `WorkloadTooltip` inside `WorkloadRow`:
```typescript
<WorkloadTooltip
  user={user.name.split(" ")[0]}
  tasks={tasks}
  boulders={boulders}
  total={total}
  avg30d={avg30d}
  weights={weights}
/>
```

In the `WorkloadChart` component, pass `weights={TIME_WEIGHTS}` to each `WorkloadRow`:
```typescript
<WorkloadRow key={row.user.id} maxValue={maxValue} isNearTop={i < 2} weights={TIME_WEIGHTS} {...row} />
```

- [ ] **Step 5: Pass weights from dashboard page**

In `src/app/dashboard/page.tsx`, change line 115 from:
```tsx
<WorkloadChart data={data.workload} />
```
To:
```tsx
<WorkloadChart data={data.workload} priorityWeights={data.priorityWeights} />
```

- [ ] **Step 6: Verify build**

```bash
npx next build 2>&1 | tail -20
```

Expected: No type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/dashboard/workload-chart.tsx src/app/dashboard/page.tsx
git commit -m "feat: workload chart uses dynamic priority weights from API"
```

---

### Task 5: Update teams PATCH API to accept weight fields

**Files:**
- Modify: `src/app/api/teams/[id]/route.ts`

- [ ] **Step 1: Extend the PATCH handler**

In `src/app/api/teams/[id]/route.ts`, change the PATCH handler (lines 33-51) from:

```typescript
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;

    const role = await getTeamRole(user.id, id);
    if (!user.isSuperAdmin && role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: "Team name is required" }, { status: 400 });

    const team = await prisma.team.update({ where: { id }, data: { name: name.trim() } });
    return NextResponse.json(team);
  } catch (error) {
    return handleApiError(error);
  }
}
```

To:

```typescript
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const { id } = await params;

    const role = await getTeamRole(user.id, id);
    if (!user.isSuperAdmin && role !== "manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (!body.name?.trim()) return NextResponse.json({ error: "Team name is required" }, { status: 400 });
      data.name = body.name.trim();
    }

    if (body.weightHigh !== undefined) {
      const v = Number(body.weightHigh);
      if (!Number.isInteger(v) || v < 1) return NextResponse.json({ error: "weightHigh must be a positive integer" }, { status: 400 });
      data.weightHigh = v;
    }
    if (body.weightMedium !== undefined) {
      const v = Number(body.weightMedium);
      if (!Number.isInteger(v) || v < 1) return NextResponse.json({ error: "weightMedium must be a positive integer" }, { status: 400 });
      data.weightMedium = v;
    }
    if (body.weightLow !== undefined) {
      const v = Number(body.weightLow);
      if (!Number.isInteger(v) || v < 1) return NextResponse.json({ error: "weightLow must be a positive integer" }, { status: 400 });
      data.weightLow = v;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const team = await prisma.team.update({ where: { id }, data });
    return NextResponse.json(team);
  } catch (error) {
    return handleApiError(error);
  }
}
```

- [ ] **Step 2: Verify build**

```bash
npx next build 2>&1 | tail -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/teams/[id]/route.ts
git commit -m "feat: accept priority weight fields in team PATCH API"
```

---

### Task 6: Add System Settings UI in Admin page

**Files:**
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Add state for priority weights**

In `src/app/admin/page.tsx`, after the buckets state declarations (around line 178), add:

```typescript
// Priority weights state
const [weightHigh, setWeightHigh] = useState(60);
const [weightMedium, setWeightMedium] = useState(35);
const [weightLow, setWeightLow] = useState(10);
const [savingWeights, setSavingWeights] = useState(false);
```

- [ ] **Step 2: Load current weights from team data**

Add a `useEffect` to load team weights when `activeTeamId` is available. Place after the state declarations:

```typescript
// Load team priority weights
const { data: teamWeights, mutate: mutateWeights } = useSWR<{ weightHigh: number; weightMedium: number; weightLow: number }>(
  activeTeamId ? `/api/teams/${activeTeamId}` : null
);

useEffect(() => {
  if (teamWeights) {
    setWeightHigh(teamWeights.weightHigh);
    setWeightMedium(teamWeights.weightMedium);
    setWeightLow(teamWeights.weightLow);
  }
}, [teamWeights]);
```

Note: The existing `GET /api/teams/[id]` already returns the full team record, which will include the new weight columns after migration.

- [ ] **Step 3: Add save handler**

After the bucket handlers (around line 340), add:

```typescript
const handleSaveWeights = async () => {
  if (!activeTeamId) return;
  setSavingWeights(true);
  try {
    const res = await fetch(`/api/teams/${activeTeamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightHigh, weightMedium, weightLow }),
    });
    if (!res.ok) {
      toast.error("Failed to save priority weights");
      return;
    }
    mutateWeights();
    toast.success("Priority weights saved");
  } catch {
    toast.error("Failed to save priority weights");
  } finally {
    setSavingWeights(false);
  }
};
```

- [ ] **Step 4: Replace the System Settings placeholder**

In `src/app/admin/page.tsx`, replace lines 622-630 (the placeholder div):

```tsx
{/* Placeholder for future settings */}
<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
  <h2 className="text-sm font-semibold text-zinc-200 mb-1">
    System Settings
  </h2>
  <p className="text-sm text-zinc-500">
    More settings coming soon: app name, default effort estimates, point values.
  </p>
</div>
```

With:

```tsx
{/* System Settings */}
<div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
  <div className="px-4 py-3 border-b border-zinc-800">
    <h2 className="text-sm font-semibold text-zinc-200">System Settings</h2>
    <p className="text-xs text-zinc-500 mt-0.5">Configure how your team calculates workload</p>
  </div>

  <div className="p-4 space-y-4">
    <div>
      <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Task Priority Weights</h3>
      <p className="text-xs text-zinc-500 mb-3">
        Each active task contributes this percentage to a person&apos;s workload based on its priority.
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">High</label>
          <Input
            type="number"
            min={1}
            value={weightHigh}
            onChange={(e) => setWeightHigh(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Medium</label>
          <Input
            type="number"
            min={1}
            value={weightMedium}
            onChange={(e) => setWeightMedium(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Low</label>
          <Input
            type="number"
            min={1}
            value={weightLow}
            onChange={(e) => setWeightLow(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
    <div className="flex items-center justify-end pt-1">
      <Button
        size="sm"
        onClick={handleSaveWeights}
        disabled={savingWeights}
        className="h-8 text-xs"
      >
        {savingWeights ? "Saving..." : "Save Weights"}
      </Button>
    </div>
  </div>
</div>
```

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: add priority weights settings UI in admin panel"
```

---

### Task 7: Manual verification

- [ ] **Step 1: Start dev server and test**

```bash
npm run dev
```

1. Log in as a manager
2. Go to Admin > Settings tab
3. Verify "Task Priority Weights" card shows with High=60, Medium=35, Low=10
4. Change High to 50, click Save Weights
5. Verify success toast appears
6. Go to Dashboard — workload chart should reflect 50% for high-priority tasks
7. Go to Capacity Planning — load percentages should also reflect the new weight
8. Refresh the Admin Settings page — values should persist (High=50)

- [ ] **Step 2: Test validation**

1. Try entering 0 or a negative number — should be prevented (min=1 in input)
2. Try clearing the field — should default to 1

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```
