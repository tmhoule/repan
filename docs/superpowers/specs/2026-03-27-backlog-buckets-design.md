# Backlog Buckets

Allow managers to define per-team buckets that categorize backlog tasks by work area (e.g., Mac, Windows, Packaging). Buckets serve dual purpose: tagging what area a task relates to, and routing work to the right people.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Dedicated `Bucket` model | Per-team ownership, manager control, display metadata (color, order) |
| Scope | Per-team | Each team defines its own bucket set |
| Cardinality | One bucket per task | Simple routing, no ambiguity |
| Required | Optional | Tasks can be un-bucketed; reduces friction at creation time |
| Management | Managers only | Matches existing role model |
| Colors | Preset palette (Tailwind color keys) | Consistent with app theme, works in dark/light mode |
| Backlog UX | Grouped view + filter tabs | Default grouped with Uncategorized at top; tabs to filter to one bucket |

## Data Model

### New `Bucket` Model

```prisma
model Bucket {
  id           String   @id @default(uuid())
  name         String
  colorKey     String   @map("color_key")    // e.g. "blue", "purple", "teal"
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

### Task Model Change

Add a nullable foreign key:

```prisma
bucketId String? @map("bucket_id")
bucket   Bucket? @relation(fields: [bucketId], references: [id], onDelete: SetNull)
```

`onDelete: SetNull` ensures that deleting a bucket moves its tasks back to Uncategorized rather than failing.

### Team Model Change

Add the reverse relation:

```prisma
buckets Bucket[]
```

### Preset Color Palette

Buckets store a color key string, not a raw hex value. The frontend maps keys to Tailwind classes:

| Key | Light Mode | Dark Mode | Also Used By |
|-----|-----------|-----------|-------------|
| `blue` | `bg-blue-100 text-blue-700 border-blue-200` | `bg-blue-950 text-blue-400 border-blue-800` | In Progress status |
| `purple` | `bg-purple-100 text-purple-700 border-purple-200` | `bg-purple-950 text-purple-400 border-purple-800` | Boulder status |
| `amber` | `bg-amber-100 text-amber-700 border-amber-200` | `bg-amber-950 text-amber-400 border-amber-800` | Medium priority |
| `teal` | `bg-teal-100 text-teal-700 border-teal-200` | `bg-teal-950 text-teal-400 border-teal-800` | Small effort |
| `red` | `bg-red-100 text-red-700 border-red-200` | `bg-red-950 text-red-400 border-red-800` | High priority |
| `green` | `bg-green-100 text-green-700 border-green-200` | `bg-green-950 text-green-400 border-green-800` | Done status |
| `orange` | `bg-orange-100 text-orange-700 border-orange-200` | `bg-orange-950 text-orange-400 border-orange-800` | Stalled status |
| `pink` | `bg-pink-100 text-pink-700 border-pink-200` | `bg-pink-950 text-pink-400 border-pink-800` | Accents |
| `cyan` | `bg-cyan-100 text-cyan-700 border-cyan-200` | `bg-cyan-950 text-cyan-400 border-cyan-800` | Charts |

## API Design

### Bucket Management (Managers Only)

**`GET /api/teams/[teamId]/buckets`**
Returns buckets for the team, ordered by `displayOrder`.

Response: `{ buckets: Array<{ id, name, colorKey, displayOrder }> }`

**`POST /api/teams/[teamId]/buckets`**
Create a new bucket.

Body: `{ name: string, colorKey: string }`
- `displayOrder` auto-assigned as max + 1
- Validates `colorKey` against preset palette
- Validates `name` uniqueness within team
- Returns the created bucket

**`PATCH /api/teams/[teamId]/buckets/[id]`**
Update name, color, or display order.

Body: `{ name?: string, colorKey?: string, displayOrder?: number }`

**`DELETE /api/teams/[teamId]/buckets/[id]`**
Delete a bucket. All tasks in this bucket have `bucketId` set to null (Uncategorized) via `onDelete: SetNull`.

### Task Bucketing

No new endpoints. The existing task create and update flows accept an optional `bucketId` field:

- `POST /api/tasks` — optional `bucketId` in body
- `PATCH /api/tasks/[id]` — optional `bucketId` in body (set to `null` to uncategorize)

Any team member can set or change a task's bucket.

### Backlog Endpoint Changes

**`GET /api/backlog`** gains:
- Optional `?bucketId=<id>` query param to filter to a single bucket
- Each task in the response includes `bucket: { id, name, colorKey } | null`

Grouped view is assembled client-side by grouping the response array by `bucket`.

### Permissions

| Action | Who |
|--------|-----|
| Create, edit, delete bucket definitions | Managers only |
| Assign a task to a bucket | Any team member |
| Filter and view by bucket | Any team member |

## UI Design

### Backlog Page (Primary Integration)

**Filter tab bar** at the top of the backlog:
- "All" tab (default, selected state)
- One tab per bucket with color dot and name
- "Uncategorized" tab in muted gray
- Clicking a tab filters to that bucket only; clicking "All" returns to grouped view

**Grouped view** (default when "All" is selected):
- **Uncategorized group appears first** to encourage bucketing during grooming
- Each bucket is a collapsible section with:
  - Color-coded header (dot + name + task count)
  - Collapse/expand toggle
  - Tasks listed within, still sorted by urgency
- Empty buckets are hidden (no empty "Windows" section if all Windows tasks are assigned)

### Task Create/Edit Forms

- Optional "Bucket" dropdown field
- Shows each bucket as: color dot + name
- Empty option = Uncategorized
- Positioned after priority, before effort estimate

### Task Detail View

- Bucket shown as a badge (color dot + name) near the priority and effort badges
- Clickable to change bucket inline via dropdown

### Bucket Management (Managers)

Accessed via a "Manage Buckets" link on the backlog page (visible to managers only).

- List of current buckets with name, color swatch, task count
- Add new bucket: name input + color palette picker
- Edit: inline rename, click color to change
- Reorder: drag-and-drop or up/down arrow buttons
- Delete: confirmation dialog noting tasks will become Uncategorized

### Places Buckets Do NOT Appear (Initial Scope)

- **Dashboard** — stays high-level
- **My Tasks** — already filtered to your tasks
- **Reports** — could be added later
- **Team view** — grouped by person, not bucket

## Migration

- New `Bucket` table
- New nullable `bucket_id` column on `tasks` table with foreign key to `buckets`
- No data migration needed — all existing tasks start as Uncategorized (null `bucketId`)
- Seed data: no default buckets created; each team's manager creates their own
