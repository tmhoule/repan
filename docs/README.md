# Repan Documentation

Repan is a team task management system built for managers who need visibility into workload, capacity, and delivery health across their teams.

## Documentation Index

| Guide | Audience | Description |
|-------|----------|-------------|
| [Getting Started](getting-started.md) | Everyone | Installation, Docker setup, first login |
| [Tasks and Workflows](tasks-and-workflows.md) | Everyone | Task statuses, creation, boulders, todos, lifecycle |
| [Backlog and Planning](backlog-and-planning.md) | Everyone | Backlog queue, buckets, claiming tasks, forecasting |
| [Dashboard](dashboard.md) | Managers | Workload chart, at-risk tasks, key projects, team summary |
| [Reports](reports.md) | Managers | Throughput, cycle time, estimation accuracy, blocker analysis |
| [Capacity Planning](capacity-planning.md) | Managers | How load is calculated, this week vs next week |
| [Teams and Roles](teams-and-roles.md) | Everyone | Roles, permissions, multi-team support, teams overview |
| [Gamification](gamification.md) | Everyone | Points, streaks, badges, anti-gaming rules |
| [Admin Guide](admin-guide.md) | Super Admins | User management, SSO/SAML, session settings, team config |

## Key Concepts

- **Tasks** are trackable work items with priority, effort, due date, and progress
- **Boulders** are ongoing operational commitments tracked by time allocation (e.g., on-call rotation at 20%)
- **Todos** are personal reminders with no tracking or deadlines
- **Backlog** is the queue of unassigned tasks available for team members to claim
- **Buckets** are manager-defined categories for organizing work (e.g., "Infrastructure", "Customer Requests")

## Architecture

Repan is a Next.js application backed by PostgreSQL via Prisma ORM. It runs in Docker with two containers: the app server and the database. A daily cron job handles automated tasks like notifications, archiving, and workload snapshots.
