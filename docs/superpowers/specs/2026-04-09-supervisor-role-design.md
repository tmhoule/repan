# Supervisor Role

## Problem

A supervisor needs read-only access to all team views (dashboard, reports with per-person breakdowns, standup, capacity) without appearing as an assignable team member in workload, reports, task assignment, or member lists. They should only be visible on the admin Users page.

## Solution

Add `supervisor` to the `TeamRole` enum. Grant supervisors the same view permissions as managers. Filter them out of all "active team member" queries used for workload, reports, standup, capacity, task assignment, search, and member lists.

## Schema Change

Add `supervisor` to the `TeamRole` enum in `src/prisma/schema.prisma`. This requires a database migration.

```prisma
enum TeamRole {
  manager
  member
  supervisor
}
```

## Access Control

### View access (grant to supervisors)

Everywhere the code checks `teamRole === "manager"` for read access, also allow `"supervisor"`:

- `src/app/api/dashboard/route.ts` — line 21: `if (!user.isSuperAdmin && teamRole !== "manager")` becomes `if (!user.isSuperAdmin && teamRole !== "manager" && teamRole !== "supervisor")`
- `src/app/api/reports/route.ts` — line 193: `canViewFull` check, same pattern
- Any other route that gates on manager role for viewing

### Write access (deny to supervisors)

Supervisors cannot modify anything. These stay manager-only with no changes:

- `requireTeamManager()` in `src/lib/team-auth.ts` — remains `role !== "manager"` check
- `canEditTask()` in `src/lib/permissions.ts` — no change
- `canAccessAdmin()` in `src/lib/permissions.ts` — no change
- Team member add/remove in `src/app/api/teams/[id]/members/route.ts` POST/DELETE
- Team settings endpoints

## Filtering: Exclude Supervisors from Team Member Queries

Every query that fetches team members for display or assignment adds `role: { not: "supervisor" }` to the `TeamMembership` where clause.

### Affected endpoints

| File | Lines | What it does |
|------|-------|-------------|
| `src/app/api/dashboard/route.ts` | 29-33 | Workload section team members |
| `src/app/api/reports/route.ts` | 197-201 | Per-person breakdown |
| `src/app/api/capacity/route.ts` | 18-22 | Capacity planning members |
| `src/app/api/standup/route.ts` | 17-21 | Standup view members |
| `src/app/api/users/route.ts` | 18-26 | Task assignment dropdown (when filtering by team) |
| `src/app/api/search/route.ts` | 78-91 | Search team members |
| `src/app/api/teams/[id]/members/route.ts` | 16-20 | Team members list |
| `src/app/api/teams/overview/route.ts` | 35-37 | Member count per team |
| `src/app/team/page.tsx` | 18-26 | Team member cards (frontend fetches via /api/users) |

### Not affected

- Admin Users page (`/api/users?allTeams=true`) — queries users directly, not through team membership filtering, so supervisors remain visible there
- Middleware — no role checks at middleware level
- `isSuperAdmin` logic — unchanged
- Task creation/editing flows — supervisors can't access write endpoints

## Scope

- `src/prisma/schema.prisma` — add `supervisor` to `TeamRole` enum
- New Prisma migration
- `src/app/api/dashboard/route.ts` — access control + member filtering
- `src/app/api/reports/route.ts` — access control + member filtering
- `src/app/api/capacity/route.ts` — member filtering
- `src/app/api/standup/route.ts` — member filtering
- `src/app/api/users/route.ts` — member filtering
- `src/app/api/search/route.ts` — member filtering
- `src/app/api/teams/[id]/members/route.ts` — member filtering
- `src/app/api/teams/overview/route.ts` — member count filtering
- `src/lib/team-auth.ts` — no changes needed (supervisor is not a manager)
- `src/lib/permissions.ts` — no changes needed
