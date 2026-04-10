# User Tasks View

## Problem

Clicking a teammate in `/team` currently jumps to their profile page (badges, points, streaks). What a manager actually wants in that moment is a task-focused view: "what is this person working on right now?" The profile page is still useful, but as the secondary destination reached from Admin → Users or from a "View Profile" button.

## Solution

Repurpose `/team/[id]` to render a layout that matches My Tasks, but scoped to the selected user. Change navigation so the team member cards on `/team` link to `/team/[id]`, and add a link to `/profile/[id]` from the user's name in the Admin → Users table.

## Navigation

| From | To | Action |
|------|-----|--------|
| `/team` member card name | `/team/[id]` | change existing `/profile/[id]` link |
| `/admin` Users table row name | `/profile/[id]` | plain text becomes a `<Link>` |
| `/team/[id]` "View Profile" button | `/profile/[id]` | unchanged |

## Page: `/team/[id]`

Title: the user's name alone (e.g., `Alice Chen`). No "My Tasks" or "Tasks" suffix.

### Sections

1. **Header** — back button → `/team`, avatar, user name as H1, "View Profile" button → `/profile/[id]`
2. **Active tasks** — grouped by status (not started, in progress, blocked, stalled, paused), matching the My Tasks layout. Reuse the existing TaskCard component.
3. **Boulders** — the user's boulder-status tasks with time allocation.
4. **Completed tasks** — recently completed tasks for this user.
5. **Todos** — renders only when the viewer is a manager or super admin. Read-only; no create/delete controls. Staff viewers don't see this section at all.

### Not included

- Points summary (lives on `/profile/[id]`)
- Backlog (team-wide, not user-scoped)
- Create Task / Boulder / Todo buttons (personal to the viewer, not the subject)

### Access control

The page itself is accessible to any team member, matching the current `/team/[id]` behavior. The Todos section is the only manager-gated element.

## API Changes

### `GET /api/todos?userId=<id>`

Add optional `userId` query parameter. Behavior:

- No param: return the caller's own todos (unchanged)
- `userId` param provided: check that the caller is a manager or super admin on the active team. If not, return 403. If authorized, return the target user's todos.

No schema changes. No new endpoints.

### Existing endpoints used as-is

- `GET /api/users/[id]` — already returns user details for any user
- `GET /api/tasks?assignedTo=<id>` — already used by the current `/team/[id]` page

## What Doesn't Change

- `/profile/[id]` itself — continues to show points, streaks, badges, history
- `/tasks` (My Tasks) — untouched, stays the personal task management page
- Task and boulder card rendering — reused without modification
- Middleware, session logic, permissions library — no changes

## Scope

- `src/app/team/[id]/page.tsx` — rewrite to match My Tasks layout for tasks/boulders/completed/todos
- `src/app/team/page.tsx` — change member card link from `/profile/[id]` to `/team/[id]`
- `src/app/admin/page.tsx` — wrap the user name in the Users table with a `<Link>` to `/profile/[id]`
- `src/app/api/todos/route.ts` — add `userId` query param with manager-only access check
