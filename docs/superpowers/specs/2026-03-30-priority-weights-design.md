# Per-Team Task Priority Weights

## Problem

Task priority weights (High: 60, Medium: 35, Low: 10) are hardcoded in three places across the codebase. Managers need to customize these per team to reflect how their team allocates effort across priority levels.

## Solution

Add three integer columns to the `Team` model and expose them in Admin > Settings > System Settings. Each manager edits weights for their own team.

## Database

Add to `Team` model in `prisma/schema.prisma`:

- `weightHigh Int @default(60)`
- `weightMedium Int @default(35)`
- `weightLow Int @default(10)`

Migration adds columns with defaults — existing teams get 60/35/10 automatically.

## API Changes

### Reads (replace hardcoded weights)

1. **`src/app/api/capacity/route.ts`** — Currently hardcodes `weight = t.priority === "high" ? 60 : ...` at line 77. Fetch the team record and use `team.weightHigh`, `team.weightMedium`, `team.weightLow`.

2. **`src/app/api/dashboard/route.ts`** — Currently hardcodes `* 60`, `* 35`, `* 10` at lines 60-62. Same approach — read from the team.

3. **`src/components/dashboard/workload-chart.tsx`** — Currently has `TIME_WEIGHTS: Record<string, number> = { high: 60, medium: 35, low: 10 }` at line 20. Receive weights as props from the parent component instead.

### Write

The admin page (`src/app/admin/page.tsx`) already updates teams. Add weight fields to the team update flow, or add a dedicated endpoint for saving system settings. The save updates the current manager's team record.

## UI

**Location:** Admin > Settings tab, replacing the "More settings coming soon" placeholder in the System Settings section.

**Components:**
- "Task Priority Weights" card with three labeled number inputs: High, Medium, Low
- Save button
- Validation: positive integers only (no negatives, no blanks)
- Success/error toast on save

**Scoping:** Manager sees and edits weights for their own team only — no team selector needed, team is derived from session.

## Constraints

- Weights are independent values (not required to sum to 100%)
- No reset-to-defaults button
- New teams start at 60/35/10 via database defaults
- Values must be positive integers
