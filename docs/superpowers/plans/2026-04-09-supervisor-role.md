# Supervisor Role — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only "supervisor" team role that can view all team data (dashboard, reports, standup, capacity) but doesn't appear in workload, reports, task assignment, or member lists.

**Architecture:** Add `supervisor` to the `TeamRole` Prisma enum with a migration. Update `getTeamRole()` return type. Grant supervisors manager-level view access in API routes and navigation. Filter supervisors out of all team member queries used for display/assignment. Update `canViewFullReports()` to allow supervisors. Add `isSupervisor` to the layout's effective role logic so supervisors get manager nav links but not the admin link.

**Tech Stack:** Prisma, PostgreSQL, TypeScript, Next.js, Jest

---

### Task 1: Add `supervisor` to the `TeamRole` enum (schema + migration)

**Files:**
- Modify: `src/prisma/schema.prisma:14-17`
- Create: `src/prisma/migrations/20260409100000_add_supervisor_role/migration.sql`

- [ ] **Step 1: Update the Prisma schema**

In `src/prisma/schema.prisma`, change:

```prisma
enum TeamRole {
  manager
  member
}
```

to:

```prisma
enum TeamRole {
  manager
  member
  supervisor
}
```

- [ ] **Step 2: Create the migration file**

```bash
mkdir -p src/prisma/migrations/20260409100000_add_supervisor_role
```

Create `src/prisma/migrations/20260409100000_add_supervisor_role/migration.sql`:

```sql
-- AlterEnum
ALTER TYPE "TeamRole" ADD VALUE 'supervisor';
```

- [ ] **Step 3: Run the migration**

```bash
npx prisma migrate deploy
npx prisma generate
```

Expected: Migration applies successfully, Prisma client regenerated.

- [ ] **Step 4: Commit**

```bash
git add src/prisma/schema.prisma src/prisma/migrations/20260409100000_add_supervisor_role/
git commit -m "feat: add supervisor to TeamRole enum"
```

---

### Task 2: Update `team-auth.ts` return type and `permissions.ts` for supervisor view access

**Files:**
- Modify: `src/lib/team-auth.ts`
- Modify: `src/lib/permissions.ts`
- Modify: `__tests__/lib/permissions.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `__tests__/lib/permissions.test.ts`:

```typescript
describe("supervisor role", () => {
  const supervisor = { id: "sv1", role: "staff" as const, teamRole: "supervisor" as const };

  it("supervisor can view full reports", () => {
    expect(canViewFullReports(supervisor)).toBe(true);
  });
  it("supervisor cannot access admin", () => {
    expect(canAccessAdmin(supervisor)).toBe(false);
  });
  it("supervisor cannot edit tasks", () => {
    expect(canEditTask(supervisor, { createdById: "x", assignedToId: "x" })).toBe(false);
  });
  it("supervisor cannot delete tasks", () => {
    expect(canDeleteTask(supervisor, { createdById: "x", assignedToId: "x" })).toBe(false);
  });
  it("supervisor cannot reorder backlog", () => {
    expect(canReorderBacklog(supervisor)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/permissions.test.ts --no-coverage 2>&1 | tail -20`
Expected: FAIL — `canViewFullReports(supervisor)` returns false (currently only checks for "manager").

- [ ] **Step 3: Update the `UserContext` type and `canViewFullReports`**

In `src/lib/permissions.ts`, change:

```typescript
type UserContext = { id: string; role: "manager" | "staff"; teamRole?: "manager" | "member" };
```

to:

```typescript
type UserContext = { id: string; role: "manager" | "staff"; teamRole?: "manager" | "member" | "supervisor" };
```

Then change `canViewFullReports`:

```typescript
export function canViewFullReports(user: UserContext): boolean {
  return user.teamRole === "manager" || user.teamRole === "supervisor" || user.role === "manager";
}
```

- [ ] **Step 4: Update `getTeamRole` return type**

In `src/lib/team-auth.ts`, change:

```typescript
export async function getTeamRole(userId: string, teamId: string): Promise<"manager" | "member" | null> {
```

to:

```typescript
export async function getTeamRole(userId: string, teamId: string): Promise<"manager" | "member" | "supervisor" | null> {
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/lib/permissions.test.ts --no-coverage 2>&1 | tail -20`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/team-auth.ts src/lib/permissions.ts __tests__/lib/permissions.test.ts
git commit -m "feat: update permissions and team-auth for supervisor role"
```

---

### Task 3: Grant supervisor view access in dashboard and reports APIs

**Files:**
- Modify: `src/app/api/dashboard/route.ts:21`
- Modify: `src/app/api/reports/route.ts:194`

- [ ] **Step 1: Update dashboard access check**

In `src/app/api/dashboard/route.ts`, change line 21:

```typescript
  if (!user.isSuperAdmin && teamRole !== "manager") {
```

to:

```typescript
  if (!user.isSuperAdmin && teamRole !== "manager" && teamRole !== "supervisor") {
```

- [ ] **Step 2: Update reports per-person access check**

In `src/app/api/reports/route.ts`, change line 194:

```typescript
  const canViewFull = user.isSuperAdmin || teamRole === "manager";
```

to:

```typescript
  const canViewFull = user.isSuperAdmin || teamRole === "manager" || teamRole === "supervisor";
```

- [ ] **Step 3: Verify the app compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v urgency.test.ts | grep error || echo "No new type errors"`
Expected: No new type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/dashboard/route.ts src/app/api/reports/route.ts
git commit -m "feat: grant supervisor view access to dashboard and reports"
```

---

### Task 4: Grant supervisor view access in teams overview API

**Files:**
- Modify: `src/app/api/teams/overview/route.ts:15-16`

- [ ] **Step 1: Update the membership query**

In `src/app/api/teams/overview/route.ts`, change lines 15-16:

```typescript
      const memberships = await prisma.teamMembership.findMany({
        where: { userId: user.id, role: "manager" },
        select: { teamId: true },
      });
```

to:

```typescript
      const memberships = await prisma.teamMembership.findMany({
        where: { userId: user.id, role: { in: ["manager", "supervisor"] } },
        select: { teamId: true },
      });
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/teams/overview/route.ts
git commit -m "feat: grant supervisor view access to teams overview"
```

---

### Task 5: Filter supervisors out of dashboard team member query

**Files:**
- Modify: `src/app/api/dashboard/route.ts:29-33`

- [ ] **Step 1: Add role filter to membership query**

In `src/app/api/dashboard/route.ts`, change lines 29-32:

```typescript
  const teamMemberships = await prisma.teamMembership.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true, avatarColor: true, isActive: true } } },
  });
  const teamUsers = teamMemberships.map((m) => m.user).filter((u) => u.isActive);
```

to:

```typescript
  const teamMemberships = await prisma.teamMembership.findMany({
    where: { teamId, role: { not: "supervisor" } },
    include: { user: { select: { id: true, name: true, avatarColor: true, isActive: true } } },
  });
  const teamUsers = teamMemberships.map((m) => m.user).filter((u) => u.isActive);
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/dashboard/route.ts
git commit -m "feat: exclude supervisors from dashboard workload"
```

---

### Task 6: Filter supervisors out of reports per-person query

**Files:**
- Modify: `src/app/api/reports/route.ts:198-202`

- [ ] **Step 1: Add role filter to membership query**

In `src/app/api/reports/route.ts`, change lines 198-199:

```typescript
    const teamMemberships = await prisma.teamMembership.findMany({
      where: { teamId },
      include: { user: { select: { id: true, name: true, isActive: true } } },
    });
```

to:

```typescript
    const teamMemberships = await prisma.teamMembership.findMany({
      where: { teamId, role: { not: "supervisor" } },
      include: { user: { select: { id: true, name: true, isActive: true } } },
    });
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/reports/route.ts
git commit -m "feat: exclude supervisors from reports per-person"
```

---

### Task 7: Filter supervisors out of capacity, standup, users, and search APIs

**Files:**
- Modify: `src/app/api/capacity/route.ts:18-19`
- Modify: `src/app/api/standup/route.ts:17-18`
- Modify: `src/app/api/users/route.ts:18-19`
- Modify: `src/app/api/search/route.ts:78-79`

- [ ] **Step 1: Update capacity API**

In `src/app/api/capacity/route.ts`, change lines 18-19:

```typescript
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId },
```

to:

```typescript
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId, role: { not: "supervisor" } },
```

- [ ] **Step 2: Update standup API**

In `src/app/api/standup/route.ts`, change lines 17-18:

```typescript
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId },
```

to:

```typescript
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId, role: { not: "supervisor" } },
```

- [ ] **Step 3: Update users API (team-filtered path)**

In `src/app/api/users/route.ts`, change lines 18-19:

```typescript
      const memberships = await prisma.teamMembership.findMany({
        where: { teamId },
```

to:

```typescript
      const memberships = await prisma.teamMembership.findMany({
        where: { teamId, role: { not: "supervisor" } },
```

- [ ] **Step 4: Update search API**

In `src/app/api/search/route.ts`, change lines 78-79:

```typescript
    const teamMemberIds = (await prisma.teamMembership.findMany({
      where: { teamId },
```

to:

```typescript
    const teamMemberIds = (await prisma.teamMembership.findMany({
      where: { teamId, role: { not: "supervisor" } },
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/capacity/route.ts src/app/api/standup/route.ts src/app/api/users/route.ts src/app/api/search/route.ts
git commit -m "feat: exclude supervisors from capacity, standup, users, and search"
```

---

### Task 8: Filter supervisors from team members list and overview member count

**Files:**
- Modify: `src/app/api/teams/[id]/members/route.ts:16-17`
- Modify: `src/app/api/teams/overview/route.ts:35-36`

- [ ] **Step 1: Update team members list**

In `src/app/api/teams/[id]/members/route.ts`, change lines 16-17:

```typescript
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId: id },
```

to:

```typescript
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId: id, role: { not: "supervisor" } },
```

- [ ] **Step 2: Update team overview member count**

In `src/app/api/teams/overview/route.ts`, change lines 35-36:

```typescript
      const memberCount = await prisma.teamMembership.count({
        where: { teamId, user: { isActive: true } },
      });
```

to:

```typescript
      const memberCount = await prisma.teamMembership.count({
        where: { teamId, role: { not: "supervisor" }, user: { isActive: true } },
      });
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/teams/[id]/members/route.ts src/app/api/teams/overview/route.ts
git commit -m "feat: exclude supervisors from team member list and overview count"
```

---

### Task 9: Update layout and header for supervisor navigation

**Files:**
- Modify: `src/app/layout.tsx:50`
- Modify: `src/components/layout/header.tsx:52`

- [ ] **Step 1: Elevate supervisor role in layout**

In `src/app/layout.tsx`, change line 50:

```typescript
      if (membership?.role === "manager") effectiveRole = "manager";
```

to:

```typescript
      if (membership?.role === "manager" || membership?.role === "supervisor") effectiveRole = "manager";
```

This gives supervisors the "manager" effective role so the header shows dashboard/reports/capacity nav links.

- [ ] **Step 2: Pass `isSupervisor` flag through to header**

Actually, the layout passes `effectiveRole` as `user.role`, and the header uses `isManager = user?.role === "manager"`. Since supervisors now get `effectiveRole = "manager"`, they'll see all manager nav links including the admin dropdown item.

To hide the admin link from supervisors, the layout needs to pass the actual team role. In `src/app/layout.tsx`, change the `initialUser` construction (around line 57):

```typescript
    initialUser = session
      ? {
          id: session.id,
          name: session.name,
          role: effectiveRole,
          avatarColor: session.avatarColor,
          isSuperAdmin: session.isSuperAdmin,
          ssoUser: session.ssoUser,
          teamCount,
          teamRole: membership?.role ?? null,
        }
      : null;
```

Then update the type on line 32 to include `teamRole`:

```typescript
  let initialUser: { id: string; name: string; role: string; avatarColor: string; isSuperAdmin: boolean; ssoUser: boolean; teamCount: number; teamRole: string | null } | null = null;
```

- [ ] **Step 3: Update user context type**

In `src/components/user-context.tsx`, change line 5:

```typescript
type User = { id: string; name: string; role: string; avatarColor: string; isSuperAdmin?: boolean; ssoUser?: boolean; teamCount?: number } | null;
```

to:

```typescript
type User = { id: string; name: string; role: string; avatarColor: string; isSuperAdmin?: boolean; ssoUser?: boolean; teamCount?: number; teamRole?: string | null } | null;
```

- [ ] **Step 4: Hide admin link from supervisors in header**

In `src/components/layout/header.tsx`, change line 225:

```typescript
                {isManager && (
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
```

to:

```typescript
                {isManager && user?.teamRole !== "supervisor" && (
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
```

- [ ] **Step 5: Verify the app compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v urgency.test.ts | grep error || echo "No new type errors"`
Expected: No new type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.tsx src/components/layout/header.tsx src/components/user-context.tsx
git commit -m "feat: grant supervisors manager nav with admin link hidden"
```

---

### Task 10: Verify end-to-end

**Files:** None (verification only)

- [ ] **Step 1: Run all tests**

Run: `npx jest --no-coverage 2>&1 | tail -20`
Expected: All tests pass.

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit 2>&1 | grep -v urgency.test.ts | grep error || echo "No type errors"`
Expected: No new errors.

- [ ] **Step 3: Manual smoke test**

Start the dev server and verify:
1. Create or update a user to have `supervisor` team role via database
2. Log in as that supervisor user
3. Verify: dashboard, reports, capacity, standup pages all load
4. Verify: supervisor does NOT appear in workload charts, per-person reports, capacity planning, standup, or task assignment dropdown
5. Verify: admin link is not visible in the header dropdown
6. Verify: supervisor still appears on the admin Users page (`/admin` as a manager)

Run: `npx next dev`
