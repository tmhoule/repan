# Repan — Gamified Team Task Tracker

**Date:** 2026-03-23
**Status:** Draft

## Overview

Repan is a web-based team task management app with gamification. It helps a manager and their team track work, prioritize dynamically based on importance and deadlines, manage a project backlog with lightweight forecasting, and stay motivated through points, streaks, and badges. Designed for a team of 7-8 scaling to 30+.

## Goals

- Give staff a clear, prioritized view of their work with rich progress tracking
- Give the manager visibility into workload, at-risk items, and backlog health
- Make task management engaging through gamification that rewards good habits, not competition
- Keep it simple — no passwords, minimal friction, one app to check

## Non-Goals

- Not a full project management suite (no Gantt charts, sprints, or resource planning)
- No email/Slack notifications in v1
- No mobile app in v1 (responsive web design only; API supports future mobile)
- No external integrations in v1

## Architecture

### Tech Stack

- **Framework:** Next.js 14+ (App Router) with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Styling:** Tailwind CSS + shadcn/ui components
- **Charts:** Recharts
- **Animations:** Framer Motion (celebrations, badge reveals, streak effects)
- **Data Fetching:** React Server Components + SWR for client-side
- **Deployment:** Docker-ready (VPS, Vercel, or internal server)

### Project Structure

```
repan/
├── src/
│   ├── app/              # Next.js App Router pages & API routes
│   │   ├── api/          # REST API endpoints
│   │   │   ├── tasks/    # CRUD, status updates, progress
│   │   │   ├── users/    # User management
│   │   │   ├── backlog/  # Backlog operations
│   │   │   ├── points/   # Points and awards
│   │   │   └── reports/  # Report generation
│   │   ├── (auth)/       # Login screen
│   │   ├── tasks/        # My Tasks view, Task Detail
│   │   ├── backlog/      # Backlog view
│   │   ├── team/         # Team view
│   │   ├── dashboard/    # Manager dashboard
│   │   ├── reports/      # Reports view
│   │   ├── profile/      # Profile & Achievements
│   │   └── admin/        # User & badge management (manager only)
│   ├── components/       # Shared UI components
│   │   ├── ui/           # shadcn/ui base components
│   │   ├── tasks/        # Task-related components
│   │   ├── gamification/ # Points, badges, streaks, celebrations
│   │   └── dashboard/    # Charts and dashboard widgets
│   ├── lib/              # Business logic
│   │   ├── urgency.ts    # Urgency score calculation
│   │   ├── forecasting.ts # Backlog forecasting
│   │   ├── points.ts     # Points calculation engine
│   │   └── badges.ts     # Badge criteria evaluation engine
│   └── prisma/           # Database schema & migrations
│       └── schema.prisma
├── public/               # Static assets
├── docs/                 # Documentation
└── docker-compose.yml    # Development & deployment
```

### Key Architectural Decisions

- **Single codebase:** Next.js API routes serve both the web app and a future mobile app. No separate backend needed.
- **Pure business logic:** Urgency scoring, forecasting, and points calculation live in `lib/` as pure, testable functions.
- **Data-driven badges:** Badge criteria stored in the database and evaluated by a rules engine. New badges added through the admin UI without code changes.
- **Append-only activity log:** Every task change is recorded. Full audit trail, never loses history.
- **Responsive from day one:** Tailwind ensures the UI works on tablets and phones even before a dedicated mobile app.

## Data Model

### Users

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Unique display name |
| role | Enum | `manager` or `staff` |
| avatar_color | String | Color for avatar circle |
| created_at | DateTime | Account creation date |
| is_active | Boolean | Soft delete for deactivated users |

Authentication: no passwords. Users select their name from a list to log in. Manager creates accounts via the admin interface.

### Tasks

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| title | String | Task title |
| description | String? | Optional longer description |
| status | Enum | `not_started`, `in_progress`, `blocked`, `stalled`, `done` |
| priority | Enum | `high`, `medium`, `low` |
| percent_complete | Int | 0-100 |
| effort_estimate | Enum | `small`, `medium`, `large` |
| due_date | DateTime? | Optional deadline |
| created_at | DateTime | When the task was created |
| completed_at | DateTime? | When the task was marked done |
| created_by | UUID | FK to Users — who created this task |
| assigned_to | UUID? | FK to Users — null means it's in the backlog |
| position | Int | Sort order within backlog or personal list |

All fields are editable by the manager and the assigned staff member. Every edit is logged in the activity log.

### Task Activity Log

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| task_id | UUID | FK to Tasks |
| user_id | UUID | FK to Users — who made this change |
| timestamp | DateTime | When the change occurred |
| type | Enum | `comment`, `status_change`, `progress_update`, `priority_change`, `assignment_change`, `due_date_change`, `effort_change`, `blocker_added`, `blocker_resolved` |
| content | String? | Comment text or change description |
| old_value | String? | Previous value (for field changes) |
| new_value | String? | New value (for field changes) |

Append-only. Never deleted or modified.

### Points Ledger

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to Users |
| task_id | UUID? | FK to Tasks (null for streak bonuses) |
| action_type | String | What earned the points |
| points | Int | Points awarded |
| timestamp | DateTime | When points were earned |

### Awards (Badge Definitions)

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | String | Badge name |
| description | String | What it means |
| icon | String | Icon identifier or emoji |
| criteria_type | String | Rule type for evaluation engine |
| criteria_value | JSON | Parameters for the rule (e.g., `{"count": 5, "action": "complete_on_time"}`) |
| is_active | Boolean | Can be earned (allows retiring badges) |
| created_at | DateTime | When the badge was defined |

Data-driven: manager creates and edits badges through the admin UI. The badge engine evaluates criteria after each qualifying action.

### User Awards

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to Users |
| award_id | UUID | FK to Awards |
| earned_at | DateTime | When the badge was earned |

### Streaks

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK to Users |
| streak_type | String | `daily_checkin`, `on_time_completion`, `weekly_momentum` |
| current_count | Int | Current streak length |
| longest_count | Int | Personal best |
| last_activity | DateTime | Last qualifying action |

## Dynamic Priority & Urgency Scoring

Tasks are sorted by a calculated urgency score, not raw priority alone.

### Urgency Score Formula

```
urgency = base_priority + due_date_modifier + status_modifier
```

**Base priority:**
- High = 30
- Medium = 20
- Low = 10

**Due date modifier:**
- 7+ days away: +0
- 3-7 days away: +5
- 1-2 days away: +10
- Due today: +20
- Overdue: +30, plus +2 per additional day overdue

**Status modifier:**
- Blocked or Stalled: +5

**Example:** A Low priority task 3 days overdue scores 10 + 30 + 6 = 46, outranking a Medium task due next week (20 + 0 = 20).

Tasks with no due date sort by base priority only, appearing below time-sensitive items.

## Backlog Forecasting

### Effort Points

- Small = 1 point
- Medium = 3 points
- Large = 5 points

### Throughput Tracking

The system tracks the team's rolling average throughput: total effort points completed per week over the last 4 weeks.

### Forecast Calculation

For any backlog item:

```
effort_ahead = sum of effort points for all backlog items ranked above this one
weeks_to_start = effort_ahead / weekly_throughput
```

Displayed as approximate ranges: "~2-3 weeks", "~1 month". Never as specific dates.

### Backlog Health Indicators

- Total unassigned tasks count
- Total effort points in backlog
- Estimated weeks of work in backlog at current pace
- Trend: is the backlog growing or shrinking?

## Gamification System

### Point-Earning Actions

| Action | Points | Rationale |
|--------|--------|-----------|
| Complete a task (Small) | 10 | Core reward |
| Complete a task (Medium) | 15 | Bigger tasks earn more |
| Complete a task (Large) | 25 | Biggest reward for biggest effort |
| Complete on time or early | +5 bonus | Rewards hitting deadlines |
| Update task progress | 2 | Encourages keeping things current |
| Add a comment | 1 | Encourages communication |
| Resolve a blocker | 5 | Rewards unblocking work |
| Pick up a backlog item | 3 | Rewards taking initiative |

### Streaks

- **Daily Check-in:** Updated at least one task today. Milestones at 3, 5, 10, 30 days.
- **On-Time Streak:** Consecutive tasks completed by their due date.
- **Momentum:** Completed at least one task every week for X consecutive weeks.

Streaks display as a flame icon with the count next to the user's name.

### Starter Badges

| Badge | Criteria | Icon |
|-------|----------|------|
| First Blood | Complete your first task | sword |
| Backlog Buster | Pick up and complete 5 backlog items | broom |
| Unblocker | Resolve 3 blockers | key |
| Streak Master | 10-day daily check-in streak | fire |
| Deadline Crusher | 5 tasks completed on time in a row | clock |
| Centurion | Reach 100 total points | shield |
| Commentator | Leave 20 comments | speech bubble |
| Heavy Lifter | Complete 3 Large-effort tasks | weight |
| Early Bird | Complete 3 tasks before their due date | sunrise |
| Team Player | Pick up 10 backlog items | handshake |
| Consistency King | 4-week momentum streak | crown |
| Prolific | Complete 25 total tasks | star |
| Detail Oriented | Update progress on a task 10+ times | magnifying glass |
| Rapid Fire | Complete 3 tasks in one day | lightning |
| Marathon Runner | 30-day daily check-in streak | medal |

This is a starter set. Additional badges are created through the admin UI at any time, using the data-driven badge criteria engine. No code changes required.

### Badge Criteria Engine

Badges are evaluated after each qualifying action (task completion, comment, status change, etc.). The engine supports these criteria types:

- `count_action` — performed action X a total of N times (e.g., complete 25 tasks)
- `streak_milestone` — reached streak length N for streak type X
- `consecutive_action` — performed action X consecutively N times (e.g., 5 on-time completions in a row)
- `single_day_count` — performed action X at least N times in one day
- `total_points` — accumulated N total points
- `compound` — combination of multiple criteria (AND/OR)

New criteria types can be added in code when the existing set doesn't cover a desired badge.

### Visual Feedback

- **Task completion:** Confetti or burst animation, points float up
- **Badge earned:** Toast notification with badge icon, name, and description
- **Streak active:** Flame icon with count next to user's name in all views
- **Milestone hit:** Larger celebration with sound (optional, user can mute)

## Application Views

### 1. Login Screen

Grid of user avatars with names. Click to enter. No passwords. Clean, welcoming design.

### 2. My Tasks (Staff Home)

- Points and streak summary at top
- Task list sorted by urgency score
- Each task shows: title, status badge, priority indicator, due date, percent complete bar
- Quick actions: update progress (slider), mark done, flag blocked/stalled, add comment
- Completion triggers celebration animation
- Filter/search bar

### 3. Task Detail / Edit

- All fields editable inline
- Full activity log (chronological, all changes and comments)
- Progress slider
- Blocker flag toggle with description field
- Comment box
- Shows created by, assigned to, creation date, last update

### 4. Backlog

- Unassigned tasks sorted by priority/urgency
- Each shows: title, priority, effort estimate, forecasted "estimated start" range
- Staff can claim items (assigns to them, awards points)
- Manager can drag to reorder
- Summary bar at top: total items, total effort, estimated weeks of work, trend indicator

### 5. Team View

- Grid of team members showing: name, avatar, current task count, active streak, recent badges
- Click a person to see their full task list
- No rankings or leaderboards — just visibility

### 6. Manager Dashboard

- **Workload distribution:** Bar chart of tasks per person, colored by priority
- **At-risk items:** List of overdue, stalled, or blocked tasks with assignee and days overdue
- **Backlog health:** Total items, effort points, weeks of work, growing/shrinking trend
- **Weekly throughput:** Line chart of effort points completed per week (last 8 weeks)
- **Team activity feed:** Recent updates across all tasks

### 7. Reports

- Weekly and monthly summary views
- Tasks completed, tasks added, backlog delta
- Throughput trend chart
- Per-person contribution summary (tasks completed, points earned)
- Overdue/missed deadline count
- Exportable (PDF or printable)

### 8. Profile & Achievements

- User's badges displayed in a grid with earned dates
- Points history
- Current streaks with personal bests
- Stats: total tasks completed, on-time rate, average completion time
- Visible to all team members

### 9. Admin (Manager Only)

- **User management:** Create, edit, deactivate user accounts. Set role (manager/staff).
- **Badge management:** Create new badges, edit criteria, retire old badges. Preview badge criteria before publishing.
- **System settings:** App name, default effort estimates, point values (future).

## In-App Notifications

Notification bell in the header with unread count. Notifications for:

- Task assigned to you
- Due date approaching (1 day warning)
- Someone commented on your task
- Badge earned or streak milestone hit
- A task you're blocked on got unblocked

Notifications are in-app only. No email or external notifications in v1.

## Security Considerations

- No password authentication — acceptable for an internal team tool on a trusted network
- Manager role required for: creating/editing users, accessing admin, reordering backlog, viewing full reports
- Staff can only edit tasks assigned to them or tasks they created
- All API routes check user role before performing privileged operations
- CSRF protection via Next.js built-in mechanisms

## Future Considerations (Not in v1)

- Mobile app (React Native consuming the same API routes)
- Email/Slack notifications
- Password or SSO authentication for larger deployments
- Custom point values configurable per action
- Team goals and group achievements
- Task dependencies (task A blocks task B)
- File attachments on tasks
- Time tracking
- API webhooks for external integrations
