# Quick To Dos

Lightweight personal to-do items for small actions like "email Tom about tomorrow". Auto-assigned to the creator, not tracked in reports or dashboard. Deleted on completion.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Separate `Todo` model | Clean separation from tasks; no risk of leaking into reports/dashboard/backlog |
| On completion | Hard delete | Disappears immediately; no completed section needed |
| Assignment | Auto-assigned to creator | Always personal; no assignment UI needed |
| Tracking | None | Not in reports, dashboard, team view, or gamification |

## Data Model

### New `Todo` Model

```prisma
model Todo {
  id          String   @id @default(uuid())
  title       String
  description String?
  userId      String   @map("user_id")
  teamId      String   @map("team_id")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id])
  team Team @relation(fields: [teamId], references: [id])

  @@map("todos")
}
```

### Model Changes

**User model** — add reverse relation:
```prisma
todos Todo[]
```

**Team model** — add reverse relation:
```prisma
todos Todo[]
```

## API Design

**`GET /api/todos`**
Returns todos for the current user on the active team, ordered by `createdAt` descending (newest first).

Response: `{ todos: Array<{ id, title, description, createdAt }> }`

**`POST /api/todos`**
Create a new to do. Auto-assigns `userId` from session and `teamId` from active team.

Body: `{ title: string, description?: string }`
- Validates title is non-empty
- Returns the created todo

**`PATCH /api/todos/[id]`**
Update title or description. Owner only.

Body: `{ title?: string, description?: string }`

**`DELETE /api/todos/[id]`**
Delete (mark done). Owner only.

## UI Design

### My Tasks Page

**"Create To Do" button** — to the left of "Create Task" in the header button row. Lighter styling than Create Task (outline variant).

**To Do section** — positioned between active tasks and boulders:
- Compact cards, significantly smaller than task cards
- Each card shows:
  - Title (clickable, links to `/todos/[id]` edit page)
  - Description in smaller muted text (if present)
  - "Done" button on the right (deletes the todo)
- No progress bar, priority, effort, due date, status badges, or comment field

**Create flow** — clicking "Create To Do" navigates to `/todos/new`, a minimal page with just title + description fields and a Create button.

### To Do Edit Page (`/todos/[id]`)

- Minimal layout matching the task detail pattern
- Back link to My Tasks
- Title and description fields
- Auto-save on field changes (same debounce pattern as task edit)
- Delete button to remove the todo

### Places To Dos Do NOT Appear

- Dashboard
- Reports
- Team view
- Backlog
- Gamification / points
- Activity log
- Global search
