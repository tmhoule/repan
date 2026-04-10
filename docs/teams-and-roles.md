# Teams and Roles

## Roles

Repan has three levels of access:

### Super Admin

The highest privilege level. Created during initial setup. Can:
- Access the Admin panel
- Configure SSO/SAML
- Manage session timeouts
- Create and delete teams
- Grant super admin to other users
- See all teams in the Teams Overview
- Act as manager on every team

### Manager

Can be set as a global role (on the User record) or a team-level role (on the TeamMembership). Either grants manager access. Managers can:
- View the Dashboard, Reports, Capacity, and Teams Overview pages
- Create and manage buckets
- Assign tasks to any team member
- Delete any task on their team
- View the Contribution by Person table
- Manage team members and their roles

### Staff

The default role. Staff can:
- View and manage their own tasks
- Claim tasks from the backlog
- View team member profiles and task lists (read-only)
- See the Team, History, and Standup pages
- Change task status, progress, and comments on their tasks

Staff **cannot** change task assignment by default. Managers can enable this per team via the "Users can assign tasks to others" toggle in Admin settings.

## Team Structure

Every user belongs to one or more teams via memberships. Each membership has a team-level role:

- **Manager** — Can edit team settings, manage buckets, and view full reports for that team
- **Member** — Standard team member
- **Supervisor** — Read-only oversight role (see below)

A user can be a manager on one team and a member on another.

## Supervisor Role

The **supervisor** team role grants read-only access to everything a manager can view — Dashboard, Reports (including the Contribution by Person table), Capacity, Standup, and Teams Overview — without making the supervisor part of the team's workload or reporting pool.

Supervisors:

- **Can view** Dashboard, Reports, Capacity, Standup, and Teams Overview for their team
- **Do not appear** in workload charts, per-person reports, capacity planning, standup, task assignment dropdowns, search results, or the team members list
- **Cannot** create, edit, assign, or delete tasks
- **Cannot** manage team members, buckets, or team settings
- **Cannot** access the Admin panel (the admin link is hidden from their user menu)
- **Do appear** on the Admin → Users page, so super admins and managers can still manage them

This role is for people who need visibility into a team's health — line managers, directors, coaches — without being counted as someone who picks up tasks.

## Multi-Team Support

Users with multiple team memberships see a team switcher in their user menu. The active team determines which data they see across all pages. Switching teams updates the session to scope everything to the selected team.

After login, if a user has exactly one team, they go directly to their tasks. If they have multiple teams, they see the team selection page.

## Teams Overview

Managers and super admins can access `/teams/overview` from the **Teams** nav link. This shows a health card for each team they manage:

| Metric | What it shows |
|--------|---------------|
| **Health Dot** | Green, yellow, or red composite indicator |
| **Members** | Team size |
| **WIP** | Tasks currently in progress |
| **At Risk** | Blocked + overdue tasks |
| **Backlog** | Unassigned items |
| **pts/wk** | Average weekly throughput |
| **Sparkline** | 8-week throughput trend |

### Health Score

The health dot is computed from:
- **Red** — At-risk count exceeds team size, or blocked count exceeds half the team
- **Yellow** — Any at-risk tasks, or backlog exceeds 5x team size
- **Green** — No significant issues

Teams are sorted worst-first so problems surface immediately.

## The Team Page

Available to all users at `/team`. Shows each team member with:
- Active tasks with progress circles
- Risk indicators (blocked, overdue, behind, stale counts)
- Boulder allocations
- Points total and recent badges
- Daily streak flame
- Completed task count

Click a team member's name to view their full profile with stats, streaks, badges, and task history.

## The Standup Page

A daily view at `/standup` designed for morning standups. For each team member, it shows:
- **Yesterday** — Tasks completed since yesterday
- **Today** — Active tasks they're working on
- **Blocked** — Blocked tasks with blocker reasons

Members with no tasks appear faded. All task titles link to their detail pages.
