# Repan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a gamified team task tracker web app with dynamic priority scoring, backlog forecasting, and a badge/streak system.

**Architecture:** Next.js 14+ App Router with TypeScript, PostgreSQL via Prisma ORM, Tailwind CSS + shadcn/ui for styling. Pure business logic functions in `src/lib/` tested independently. API routes in `src/app/api/` serve both the web UI and future mobile app. Session via HTTP-only cookie (no passwords).

**Tech Stack:** Next.js 14+, TypeScript, PostgreSQL, Prisma, Tailwind CSS, shadcn/ui, Recharts, Framer Motion, SWR, Docker

**Spec:** `docs/superpowers/specs/2026-03-23-repan-task-tracker-design.md`

---

## File Structure

### Database & Config
- `src/prisma/schema.prisma` — All models: User, Task, TaskActivity, Notification, PointsLedger, Award, UserAward, Streak
- `src/prisma/seed.ts` — Seed script for dev data (users, sample tasks, starter badges)
- `docker-compose.yml` — PostgreSQL + app services
- `.env.example` — Environment variable template

### Business Logic (`src/lib/`)
- `src/lib/urgency.ts` — `calculateUrgencyScore(task)` pure function
- `src/lib/forecasting.ts` — `calculateBacklogForecast(backlogItems, weeklyThroughput)` and `getWeeklyThroughput(completedTasks)`
- `src/lib/points.ts` — `calculatePoints(action, context)` with anti-gaming rules
- `src/lib/badges.ts` — Badge criteria evaluation engine, `evaluateBadges(userId, action)`
- `src/lib/streaks.ts` — Streak update logic, `updateStreak(userId, streakType, action)`
- `src/lib/permissions.ts` — `canEditTask(user, task)`, `canAccessAdmin(user)`, etc.
- `src/lib/session.ts` — Cookie-based session helpers: `getSession(cookies)`, `setSession(userId)`, `clearSession()`
- `src/lib/db.ts` — Prisma client singleton
- `src/lib/notifications.ts` — `createNotification(userId, type, data)` helper

### API Routes (`src/app/api/`)
- `src/app/api/auth/login/route.ts` — POST: set session cookie
- `src/app/api/auth/logout/route.ts` — POST: clear session cookie
- `src/app/api/users/route.ts` — GET: list users, POST: create user (manager only)
- `src/app/api/users/[id]/route.ts` — GET: user detail, PATCH: update, DELETE: deactivate
- `src/app/api/tasks/route.ts` — GET: list tasks (with filters/pagination), POST: create task
- `src/app/api/tasks/[id]/route.ts` — GET: task detail, PATCH: update fields, DELETE: delete (manager only)
- `src/app/api/tasks/[id]/comments/route.ts` — POST: add comment
- `src/app/api/tasks/[id]/activity/route.ts` — GET: activity log (paginated)
- `src/app/api/backlog/route.ts` — GET: backlog items with forecasts
- `src/app/api/backlog/reorder/route.ts` — PUT: batch reorder (manager only)
- `src/app/api/backlog/claim/route.ts` — POST: claim a backlog item
- `src/app/api/notifications/route.ts` — GET: user's notifications, PATCH: mark read
- `src/app/api/points/route.ts` — GET: user's points history
- `src/app/api/awards/route.ts` — GET: all badge definitions, POST: create badge (manager only)
- `src/app/api/awards/[id]/route.ts` — PATCH: update badge, DELETE: retire badge
- `src/app/api/dashboard/route.ts` — GET: manager dashboard data
- `src/app/api/reports/route.ts` — GET: report data (weekly/monthly)

### Pages (`src/app/`)
- `src/app/layout.tsx` — Root layout with header, nav, notification bell
- `src/app/page.tsx` — Redirect to /tasks or /login
- `src/app/(auth)/login/page.tsx` — Login screen (user avatar grid)
- `src/app/tasks/page.tsx` — My Tasks list view
- `src/app/tasks/[id]/page.tsx` — Task detail/edit view
- `src/app/tasks/new/page.tsx` — Create task form
- `src/app/backlog/page.tsx` — Backlog view
- `src/app/team/page.tsx` — Team view
- `src/app/team/[id]/page.tsx` — Individual team member's tasks
- `src/app/dashboard/page.tsx` — Manager dashboard
- `src/app/reports/page.tsx` — Reports view
- `src/app/profile/[id]/page.tsx` — Profile & achievements
- `src/app/admin/page.tsx` — Admin panel (users tab default)
- `src/app/admin/badges/page.tsx` — Badge management

### Components (`src/components/`)
- `src/components/ui/` — shadcn/ui primitives (button, card, dialog, input, slider, badge, toast, dropdown, table, tabs, popover)
- `src/components/layout/header.tsx` — App header with nav, user avatar, switch user, notification bell
- `src/components/layout/nav.tsx` — Sidebar/top navigation links
- `src/components/tasks/task-card.tsx` — Task list item (title, status, priority, due date, progress bar, quick actions)
- `src/components/tasks/task-form.tsx` — Create/edit task form (all fields)
- `src/components/tasks/task-filters.tsx` — Filter bar (status, priority, due date, search)
- `src/components/tasks/activity-log.tsx` — Chronological activity/comment list
- `src/components/tasks/comment-box.tsx` — Add comment input
- `src/components/tasks/progress-slider.tsx` — Percent complete slider with save
- `src/components/tasks/priority-badge.tsx` — Colored priority indicator
- `src/components/tasks/status-badge.tsx` — Status pill (not_started, in_progress, blocked, stalled, done)
- `src/components/backlog/backlog-list.tsx` — Sortable backlog with drag-and-drop (manager) and claim button (staff)
- `src/components/backlog/forecast-badge.tsx` — "~3 weeks" estimated start display
- `src/components/backlog/backlog-summary.tsx` — Total items, effort, weeks, trend
- `src/components/gamification/celebration.tsx` — Confetti/burst animation on task completion
- `src/components/gamification/points-popup.tsx` — Floating points animation (+10!)
- `src/components/gamification/badge-toast.tsx` — Badge earned toast notification
- `src/components/gamification/streak-flame.tsx` — Flame icon with streak count
- `src/components/gamification/badge-grid.tsx` — Grid of badge icons with names/dates
- `src/components/gamification/points-summary.tsx` — Points and streak bar for top of My Tasks
- `src/components/dashboard/workload-chart.tsx` — Bar chart: tasks per person by priority
- `src/components/dashboard/at-risk-list.tsx` — Overdue/blocked/stalled task list
- `src/components/dashboard/backlog-health.tsx` — Backlog health widget
- `src/components/dashboard/throughput-chart.tsx` — Weekly throughput line chart
- `src/components/dashboard/activity-feed.tsx` — Recent team-wide activity
- `src/components/reports/report-summary.tsx` — Weekly/monthly summary cards
- `src/components/reports/throughput-trend.tsx` — Throughput trend chart for reports
- `src/components/reports/contribution-table.tsx` — Per-person contribution breakdown
- `src/components/notifications/notification-bell.tsx` — Bell icon with unread count
- `src/components/notifications/notification-dropdown.tsx` — Dropdown list of notifications
- `src/components/admin/user-form.tsx` — Create/edit user form
- `src/components/admin/badge-form.tsx` — Create/edit badge with criteria builder

### Tests (`__tests__/`)
- `__tests__/lib/urgency.test.ts`
- `__tests__/lib/forecasting.test.ts`
- `__tests__/lib/points.test.ts`
- `__tests__/lib/badges.test.ts`
- `__tests__/lib/streaks.test.ts`
- `__tests__/lib/permissions.test.ts`
- `__tests__/api/auth.test.ts`
- `__tests__/api/tasks.test.ts`
- `__tests__/api/backlog.test.ts`
- `__tests__/api/users.test.ts`
- `__tests__/api/notifications.test.ts`
- `__tests__/api/awards.test.ts`
- `__tests__/api/dashboard.test.ts`
- `__tests__/api/reports.test.ts`

---

## Phase 1: Project Foundation

### Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `.env.example`, `.gitignore`, `docker-compose.yml`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/todd/Projects/repan
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the Next.js scaffolding with App Router and Tailwind.

- [ ] **Step 2: Install core dependencies**

```bash
npm install prisma @prisma/client swr framer-motion recharts
npm install -D jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables enabled.

- [ ] **Step 4: Add commonly needed shadcn components**

```bash
npx shadcn@latest add button card dialog input label slider badge toast dropdown-menu table tabs popover select textarea separator avatar tooltip scroll-area
```

- [ ] **Step 5: Create docker-compose.yml**

```yaml
version: "3.8"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: repan
      POSTGRES_PASSWORD: repan_dev
      POSTGRES_DB: repan
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 6: Create .env.example and .env**

```
DATABASE_URL="postgresql://repan:repan_dev@localhost:5432/repan"
NEXT_PUBLIC_APP_NAME="Repan"
```

Copy `.env.example` to `.env`.

- [ ] **Step 7: Configure Jest**

Create `jest.config.ts`:

```typescript
import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
};

export default createJestConfig(config);
```

Add to `package.json` scripts: `"test": "jest"`, `"test:watch": "jest --watch"`.

- [ ] **Step 8: Verify setup runs**

```bash
docker compose up -d
npm run dev
```

Verify: App loads at http://localhost:3000. PostgreSQL running on port 5432.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Tailwind, shadcn/ui, Prisma, Docker"
```

---

### Task 2: Prisma Schema & Database Setup

**Files:**
- Create: `src/prisma/schema.prisma`, `src/lib/db.ts`

- [ ] **Step 1: Initialize Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

Move `prisma/` directory to `src/prisma/` and update `package.json` to add `"prisma": { "schema": "src/prisma/schema.prisma" }`.

- [ ] **Step 2: Write the full Prisma schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  manager
  staff
}

enum TaskStatus {
  not_started
  in_progress
  blocked
  stalled
  done
}

enum TaskPriority {
  high
  medium
  low
}

enum EffortEstimate {
  small
  medium
  large
}

enum ActivityType {
  comment
  status_change
  progress_update
  priority_change
  assignment_change
  due_date_change
  effort_change
  blocker_added
  blocker_resolved
  title_change
  description_change
}

enum NotificationType {
  task_assigned
  due_date_approaching
  comment_added
  badge_earned
  streak_milestone
  blocker_resolved
}

model User {
  id            String    @id @default(uuid())
  name          String    @unique
  role          UserRole  @default(staff)
  avatarColor   String    @map("avatar_color")
  soundEnabled  Boolean   @default(true) @map("sound_enabled")
  createdAt     DateTime  @default(now()) @map("created_at")
  isActive      Boolean   @default(true) @map("is_active")

  createdTasks    Task[]          @relation("CreatedTasks")
  assignedTasks   Task[]          @relation("AssignedTasks")
  activities      TaskActivity[]
  notifications   Notification[]
  pointsLedger    PointsLedger[]
  userAwards      UserAward[]
  streaks         Streak[]

  @@map("users")
}

model Task {
  id              String        @id @default(uuid())
  title           String
  description     String?
  status          TaskStatus    @default(not_started)
  priority        TaskPriority  @default(medium)
  percentComplete Int           @default(0) @map("percent_complete")
  effortEstimate  EffortEstimate @default(medium) @map("effort_estimate")
  dueDate         DateTime?     @map("due_date")
  blockerReason   String?       @map("blocker_reason")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  completedAt     DateTime?     @map("completed_at")
  archivedAt      DateTime?     @map("archived_at")
  createdById     String        @map("created_by")
  assignedToId    String?       @map("assigned_to")
  backlogPosition Int?          @map("backlog_position")

  createdBy       User          @relation("CreatedTasks", fields: [createdById], references: [id])
  assignedTo      User?         @relation("AssignedTasks", fields: [assignedToId], references: [id])
  activities      TaskActivity[]
  notifications   Notification[]
  pointsLedger    PointsLedger[]

  @@map("tasks")
}

model TaskActivity {
  id        String       @id @default(uuid())
  taskId    String       @map("task_id")
  userId    String       @map("user_id")
  timestamp DateTime     @default(now())
  type      ActivityType
  content   String?
  oldValue  String?      @map("old_value")
  newValue  String?      @map("new_value")

  task      Task         @relation(fields: [taskId], references: [id])
  user      User         @relation(fields: [userId], references: [id])

  @@map("task_activities")
}

model Notification {
  id        String           @id @default(uuid())
  userId    String           @map("user_id")
  type      NotificationType
  title     String
  message   String
  taskId    String?          @map("task_id")
  isRead    Boolean          @default(false) @map("is_read")
  createdAt DateTime         @default(now()) @map("created_at")

  user      User             @relation(fields: [userId], references: [id])
  task      Task?            @relation(fields: [taskId], references: [id])

  @@map("notifications")
}

model PointsLedger {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  taskId     String?  @map("task_id")
  actionType String   @map("action_type")
  points     Int
  timestamp  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id])
  task       Task?    @relation(fields: [taskId], references: [id])

  @@map("points_ledger")
}

model Award {
  id            String   @id @default(uuid())
  name          String   @unique
  description   String
  icon          String
  criteriaType  String   @map("criteria_type")
  criteriaValue Json     @map("criteria_value")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")

  userAwards    UserAward[]

  @@map("awards")
}

model UserAward {
  id       String   @id @default(uuid())
  userId   String   @map("user_id")
  awardId  String   @map("award_id")
  earnedAt DateTime @default(now()) @map("earned_at")

  user     User     @relation(fields: [userId], references: [id])
  award    Award    @relation(fields: [awardId], references: [id])

  @@unique([userId, awardId])
  @@map("user_awards")
}

model Streak {
  id           String   @id @default(uuid())
  userId       String   @map("user_id")
  streakType   String   @map("streak_type")
  currentCount Int      @default(0) @map("current_count")
  longestCount Int      @default(0) @map("longest_count")
  lastActivity DateTime @map("last_activity")

  user         User     @relation(fields: [userId], references: [id])

  @@unique([userId, streakType])
  @@map("streaks")
}
```

- [ ] **Step 3: Create Prisma client singleton**

Create `src/lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```

Expected: Migration creates all tables. Prisma client generated.

- [ ] **Step 5: Verify schema with Prisma Studio**

```bash
npx prisma studio
```

Verify all tables exist with correct columns.

- [ ] **Step 6: Commit**

```bash
git add src/prisma/ src/lib/db.ts
git commit -m "feat: add Prisma schema with all data models"
```

---

### Task 3: Seed Data

**Files:**
- Create: `src/prisma/seed.ts`

- [ ] **Step 1: Write seed script**

```typescript
import { PrismaClient, UserRole, TaskStatus, TaskPriority, EffortEstimate } from "@prisma/client";

const prisma = new PrismaClient();

const AVATAR_COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#06B6D4", "#F97316"];

const STARTER_BADGES = [
  { name: "First Blood", description: "Complete your first task", icon: "sword", criteriaType: "count_action", criteriaValue: { action: "complete_task", count: 1 } },
  { name: "Backlog Buster", description: "Pick up and complete 5 backlog items", icon: "broom", criteriaType: "count_action", criteriaValue: { action: "complete_backlog_item", count: 5 } },
  { name: "Unblocker", description: "Resolve 3 blockers", icon: "key", criteriaType: "count_action", criteriaValue: { action: "resolve_blocker", count: 3 } },
  { name: "Streak Master", description: "10-day daily check-in streak", icon: "fire", criteriaType: "streak_milestone", criteriaValue: { streak_type: "daily_checkin", count: 10 } },
  { name: "Deadline Crusher", description: "5 tasks completed on time in a row", icon: "clock", criteriaType: "consecutive_action", criteriaValue: { action: "complete_on_time", count: 5 } },
  { name: "Centurion", description: "Reach 100 total points", icon: "shield", criteriaType: "total_points", criteriaValue: { count: 100 } },
  { name: "Commentator", description: "Leave 20 comments", icon: "speech-bubble", criteriaType: "count_action", criteriaValue: { action: "comment", count: 20 } },
  { name: "Heavy Lifter", description: "Complete 3 Large-effort tasks", icon: "weight", criteriaType: "count_action", criteriaValue: { action: "complete_large_task", count: 3 } },
  { name: "Early Bird", description: "Complete 3 tasks before their due date", icon: "sunrise", criteriaType: "count_action", criteriaValue: { action: "complete_early", count: 3 } },
  { name: "Team Player", description: "Pick up 10 backlog items", icon: "handshake", criteriaType: "count_action", criteriaValue: { action: "claim_backlog", count: 10 } },
  { name: "Consistency King", description: "4-week momentum streak", icon: "crown", criteriaType: "streak_milestone", criteriaValue: { streak_type: "weekly_momentum", count: 4 } },
  { name: "Prolific", description: "Complete 25 total tasks", icon: "star", criteriaType: "count_action", criteriaValue: { action: "complete_task", count: 25 } },
  { name: "Detail Oriented", description: "Update progress on a task 10+ times", icon: "magnifying-glass", criteriaType: "count_action", criteriaValue: { action: "progress_update_single_task", count: 10 } },
  { name: "Rapid Fire", description: "Complete 3 tasks in one day", icon: "lightning", criteriaType: "single_day_count", criteriaValue: { action: "complete_task", count: 3 } },
  { name: "Marathon Runner", description: "30-day daily check-in streak", icon: "medal", criteriaType: "streak_milestone", criteriaValue: { streak_type: "daily_checkin", count: 30 } },
];

async function main() {
  // Create users
  const manager = await prisma.user.create({
    data: { name: "Todd", role: UserRole.manager, avatarColor: AVATAR_COLORS[0] },
  });

  const staffNames = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank", "Grace"];
  const staff = await Promise.all(
    staffNames.map((name, i) =>
      prisma.user.create({
        data: { name, role: UserRole.staff, avatarColor: AVATAR_COLORS[i + 1] },
      })
    )
  );

  // Create starter badges
  await Promise.all(
    STARTER_BADGES.map((badge) =>
      prisma.award.create({ data: badge })
    )
  );

  // Create sample tasks
  const sampleTasks = [
    { title: "Update company website homepage", priority: TaskPriority.high, effortEstimate: EffortEstimate.large, assignedToId: staff[0].id, status: TaskStatus.in_progress, percentComplete: 40, dueDate: new Date("2026-03-28") },
    { title: "Prepare Q1 budget report", priority: TaskPriority.high, effortEstimate: EffortEstimate.medium, assignedToId: staff[1].id, status: TaskStatus.not_started, dueDate: new Date("2026-03-25") },
    { title: "Organize team building event", priority: TaskPriority.medium, effortEstimate: EffortEstimate.medium, assignedToId: staff[2].id, status: TaskStatus.in_progress, percentComplete: 60, dueDate: new Date("2026-04-10") },
    { title: "Review vendor contracts", priority: TaskPriority.low, effortEstimate: EffortEstimate.small, assignedToId: staff[3].id, status: TaskStatus.blocked, blockerReason: "Waiting on legal review", dueDate: new Date("2026-03-20") },
    { title: "Set up new employee onboarding docs", priority: TaskPriority.medium, effortEstimate: EffortEstimate.large, assignedToId: null, backlogPosition: 1 },
    { title: "Audit office supply inventory", priority: TaskPriority.low, effortEstimate: EffortEstimate.small, assignedToId: null, backlogPosition: 2 },
    { title: "Plan holiday party", priority: TaskPriority.low, effortEstimate: EffortEstimate.medium, assignedToId: null, backlogPosition: 3 },
    { title: "Update emergency contact list", priority: TaskPriority.medium, effortEstimate: EffortEstimate.small, assignedToId: null, backlogPosition: 4 },
  ];

  for (const task of sampleTasks) {
    await prisma.task.create({
      data: { ...task, createdById: manager.id },
    });
  }

  console.log("Seed complete: 1 manager, 7 staff, 15 badges, 8 sample tasks");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Configure seed command**

Add to `package.json` under `"prisma"`:

```json
"prisma": {
  "schema": "src/prisma/schema.prisma",
  "seed": "npx ts-node --compiler-options {\"module\":\"CommonJS\"} src/prisma/seed.ts"
}
```

Install ts-node: `npm install -D ts-node`

- [ ] **Step 3: Run seed**

```bash
npx prisma db seed
```

Expected: "Seed complete: 1 manager, 7 staff, 15 badges, 8 sample tasks"

- [ ] **Step 4: Verify with Prisma Studio**

```bash
npx prisma studio
```

Check Users (8), Awards (15), Tasks (8, 4 assigned + 4 backlog).

- [ ] **Step 5: Commit**

```bash
git add src/prisma/seed.ts package.json
git commit -m "feat: add seed script with users, badges, and sample tasks"
```

---

## Phase 2: Business Logic (TDD)

### Task 4: Urgency Scoring

**Files:**
- Create: `src/lib/urgency.ts`, `__tests__/lib/urgency.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/urgency.test.ts
import { calculateUrgencyScore } from "@/lib/urgency";

describe("calculateUrgencyScore", () => {
  const today = new Date("2026-03-23");

  it("returns base priority score for high priority task with no due date", () => {
    expect(calculateUrgencyScore({ priority: "high", status: "not_started", dueDate: null }, today)).toBe(30);
  });

  it("returns base priority score for medium priority task with no due date", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: null }, today)).toBe(20);
  });

  it("returns base priority score for low priority task with no due date", () => {
    expect(calculateUrgencyScore({ priority: "low", status: "not_started", dueDate: null }, today)).toBe(10);
  });

  it("adds +5 for blocked status", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "blocked", dueDate: null }, today)).toBe(25);
  });

  it("adds +5 for stalled status", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "stalled", dueDate: null }, today)).toBe(25);
  });

  it("adds +0 for due date 7+ days away", () => {
    const dueDate = new Date("2026-03-31"); // 8 days away
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate }, today)).toBe(20);
  });

  it("adds +5 for due date 3-7 days away", () => {
    const dueDate = new Date("2026-03-28"); // 5 days away
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate }, today)).toBe(25);
  });

  it("adds +10 for due date 1-2 days away", () => {
    const dueDate = new Date("2026-03-25"); // 2 days away
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate }, today)).toBe(30);
  });

  it("adds +20 for due today", () => {
    expect(calculateUrgencyScore({ priority: "medium", status: "not_started", dueDate: today }, today)).toBe(40);
  });

  it("adds +30 + 2 per day for overdue tasks", () => {
    const dueDate = new Date("2026-03-20"); // 3 days overdue
    expect(calculateUrgencyScore({ priority: "low", status: "not_started", dueDate }, today)).toBe(10 + 36);
  });

  it("combines due date and status modifiers", () => {
    const dueDate = new Date("2026-03-20"); // 3 days overdue
    expect(calculateUrgencyScore({ priority: "low", status: "blocked", dueDate }, today)).toBe(10 + 36 + 5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/urgency.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement urgency scoring**

```typescript
// src/lib/urgency.ts
type UrgencyInput = {
  priority: "high" | "medium" | "low";
  status: string;
  dueDate: Date | null;
};

const BASE_PRIORITY: Record<string, number> = {
  high: 30,
  medium: 20,
  low: 10,
};

export function calculateUrgencyScore(task: UrgencyInput, now: Date = new Date()): number {
  let score = BASE_PRIORITY[task.priority] ?? 10;

  // Status modifier
  if (task.status === "blocked" || task.status === "stalled") {
    score += 5;
  }

  // Due date modifier
  if (task.dueDate) {
    const msPerDay = 86400000;
    const daysUntilDue = Math.floor((task.dueDate.getTime() - now.getTime()) / msPerDay);

    if (daysUntilDue < 0) {
      // Overdue
      const daysOverdue = Math.abs(daysUntilDue);
      score += 30 + daysOverdue * 2;
    } else if (daysUntilDue === 0) {
      score += 20;
    } else if (daysUntilDue <= 2) {
      score += 10;
    } else if (daysUntilDue <= 7) {
      score += 5;
    }
    // 7+ days: +0
  }

  return score;
}

export function sortByUrgency<T extends UrgencyInput & { createdAt: Date }>(
  tasks: T[],
  now: Date = new Date()
): T[] {
  return [...tasks].sort((a, b) => {
    const scoreA = calculateUrgencyScore(a, now);
    const scoreB = calculateUrgencyScore(b, now);
    if (scoreA !== scoreB) return scoreB - scoreA;

    // Tie-break: due date ascending (earliest first), nulls last
    if (a.dueDate && b.dueDate) {
      const dueDiff = a.dueDate.getTime() - b.dueDate.getTime();
      if (dueDiff !== 0) return dueDiff;
    } else if (a.dueDate) return -1;
    else if (b.dueDate) return 1;

    // Tie-break: creation date ascending (oldest first)
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/urgency.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/urgency.ts __tests__/lib/urgency.test.ts
git commit -m "feat: add urgency score calculation with TDD"
```

---

### Task 5: Points Calculation

**Files:**
- Create: `src/lib/points.ts`, `__tests__/lib/points.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/points.test.ts
import { calculatePoints, PointAction } from "@/lib/points";

describe("calculatePoints", () => {
  it("awards 10 points for completing a small task", () => {
    expect(calculatePoints({ action: "complete_task", effortEstimate: "small" })).toBe(10);
  });

  it("awards 15 points for completing a medium task", () => {
    expect(calculatePoints({ action: "complete_task", effortEstimate: "medium" })).toBe(15);
  });

  it("awards 25 points for completing a large task", () => {
    expect(calculatePoints({ action: "complete_task", effortEstimate: "large" })).toBe(25);
  });

  it("awards 5 bonus points for on-time completion", () => {
    expect(calculatePoints({ action: "complete_on_time" })).toBe(5);
  });

  it("awards 2 points for progress update", () => {
    expect(calculatePoints({ action: "progress_update" })).toBe(2);
  });

  it("awards 1 point for a comment", () => {
    expect(calculatePoints({ action: "comment" })).toBe(1);
  });

  it("awards 5 points for resolving a blocker", () => {
    expect(calculatePoints({ action: "resolve_blocker" })).toBe(5);
  });

  it("awards 3 points for claiming a backlog item", () => {
    expect(calculatePoints({ action: "claim_backlog" })).toBe(3);
  });

  it("awards streak milestone points", () => {
    expect(calculatePoints({ action: "streak_milestone", streakCount: 3 })).toBe(5);
    expect(calculatePoints({ action: "streak_milestone", streakCount: 5 })).toBe(10);
    expect(calculatePoints({ action: "streak_milestone", streakCount: 10 })).toBe(20);
    expect(calculatePoints({ action: "streak_milestone", streakCount: 30 })).toBe(50);
  });

  it("returns 0 for non-milestone streak counts", () => {
    expect(calculatePoints({ action: "streak_milestone", streakCount: 7 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/points.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement points calculation**

```typescript
// src/lib/points.ts
export type PointAction =
  | { action: "complete_task"; effortEstimate: "small" | "medium" | "large" }
  | { action: "complete_on_time" }
  | { action: "progress_update" }
  | { action: "comment" }
  | { action: "resolve_blocker" }
  | { action: "claim_backlog" }
  | { action: "streak_milestone"; streakCount: number };

const COMPLETION_POINTS: Record<string, number> = {
  small: 10,
  medium: 15,
  large: 25,
};

const STREAK_MILESTONES: Record<number, number> = {
  3: 5,
  5: 10,
  10: 20,
  30: 50,
};

export function calculatePoints(input: PointAction): number {
  switch (input.action) {
    case "complete_task":
      return COMPLETION_POINTS[input.effortEstimate] ?? 10;
    case "complete_on_time":
      return 5;
    case "progress_update":
      return 2;
    case "comment":
      return 1;
    case "resolve_blocker":
      return 5;
    case "claim_backlog":
      return 3;
    case "streak_milestone":
      return STREAK_MILESTONES[input.streakCount] ?? 0;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/points.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/points.ts __tests__/lib/points.test.ts
git commit -m "feat: add points calculation engine with TDD"
```

---

### Task 6: Streak Management

**Files:**
- Create: `src/lib/streaks.ts`, `__tests__/lib/streaks.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/streaks.test.ts
import { shouldIncrementStreak, shouldResetStreak, isStreakMilestone } from "@/lib/streaks";

describe("daily check-in streak", () => {
  it("increments when last activity was yesterday", () => {
    const lastActivity = new Date("2026-03-22");
    const now = new Date("2026-03-23");
    expect(shouldIncrementStreak("daily_checkin", lastActivity, now)).toBe(true);
  });

  it("does not increment when last activity was today (already counted)", () => {
    const lastActivity = new Date("2026-03-23T10:00:00");
    const now = new Date("2026-03-23T15:00:00");
    expect(shouldIncrementStreak("daily_checkin", lastActivity, now)).toBe(false);
  });

  it("resets when more than 1 day gap", () => {
    const lastActivity = new Date("2026-03-20");
    const now = new Date("2026-03-23");
    expect(shouldResetStreak("daily_checkin", lastActivity, now)).toBe(true);
  });

  it("does not reset when last activity was yesterday", () => {
    const lastActivity = new Date("2026-03-22");
    const now = new Date("2026-03-23");
    expect(shouldResetStreak("daily_checkin", lastActivity, now)).toBe(false);
  });
});

describe("weekly momentum streak", () => {
  it("increments when last activity was in previous week", () => {
    const lastActivity = new Date("2026-03-16"); // Monday of previous week
    const now = new Date("2026-03-23"); // Monday of current week
    expect(shouldIncrementStreak("weekly_momentum", lastActivity, now)).toBe(true);
  });

  it("resets when more than 1 week gap", () => {
    const lastActivity = new Date("2026-03-09"); // 2 weeks ago
    const now = new Date("2026-03-23");
    expect(shouldResetStreak("weekly_momentum", lastActivity, now)).toBe(true);
  });
});

describe("streak milestones", () => {
  it("recognizes milestone counts", () => {
    expect(isStreakMilestone(3)).toBe(true);
    expect(isStreakMilestone(5)).toBe(true);
    expect(isStreakMilestone(10)).toBe(true);
    expect(isStreakMilestone(30)).toBe(true);
  });

  it("rejects non-milestone counts", () => {
    expect(isStreakMilestone(1)).toBe(false);
    expect(isStreakMilestone(7)).toBe(false);
    expect(isStreakMilestone(15)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/streaks.test.ts
```

- [ ] **Step 3: Implement streak logic**

```typescript
// src/lib/streaks.ts

const MILESTONES = new Set([3, 5, 10, 30]);

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekNumber(date: Date): number {
  // ISO week: Monday-based
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  return Math.round(((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() - 1) / 7);
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}

function weeksBetween(a: Date, b: Date): number {
  const weekA = getWeekNumber(a);
  const weekB = getWeekNumber(b);
  const yearA = a.getFullYear();
  const yearB = b.getFullYear();
  if (yearA === yearB) return weekB - weekA;
  // Simplified: works for same/adjacent years
  return (yearB - yearA) * 52 + weekB - weekA;
}

export function shouldIncrementStreak(
  streakType: string,
  lastActivity: Date,
  now: Date
): boolean {
  if (streakType === "daily_checkin") {
    return daysBetween(lastActivity, now) === 1;
  }
  if (streakType === "weekly_momentum") {
    return weeksBetween(lastActivity, now) === 1;
  }
  // on_time_completion is handled differently (per-task, not time-based)
  return false;
}

export function shouldResetStreak(
  streakType: string,
  lastActivity: Date,
  now: Date
): boolean {
  if (streakType === "daily_checkin") {
    return daysBetween(lastActivity, now) > 1;
  }
  if (streakType === "weekly_momentum") {
    return weeksBetween(lastActivity, now) > 1;
  }
  return false;
}

export function isStreakMilestone(count: number): boolean {
  return MILESTONES.has(count);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/streaks.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/streaks.ts __tests__/lib/streaks.test.ts
git commit -m "feat: add streak management logic with TDD"
```

---

### Task 7: Badge Criteria Engine

**Files:**
- Create: `src/lib/badges.ts`, `__tests__/lib/badges.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/badges.test.ts
import { evaluateCriteria, BadgeCriteria } from "@/lib/badges";

describe("evaluateCriteria", () => {
  it("count_action: returns true when count met", () => {
    const criteria: BadgeCriteria = { type: "count_action", value: { action: "complete_task", count: 5 } };
    const stats = { action_counts: { complete_task: 5 } };
    expect(evaluateCriteria(criteria, stats)).toBe(true);
  });

  it("count_action: returns false when count not met", () => {
    const criteria: BadgeCriteria = { type: "count_action", value: { action: "complete_task", count: 5 } };
    const stats = { action_counts: { complete_task: 3 } };
    expect(evaluateCriteria(criteria, stats)).toBe(false);
  });

  it("total_points: returns true when points met", () => {
    const criteria: BadgeCriteria = { type: "total_points", value: { count: 100 } };
    const stats = { total_points: 150 };
    expect(evaluateCriteria(criteria, stats)).toBe(true);
  });

  it("streak_milestone: returns true when streak count met", () => {
    const criteria: BadgeCriteria = { type: "streak_milestone", value: { streak_type: "daily_checkin", count: 10 } };
    const stats = { streaks: { daily_checkin: 10 } };
    expect(evaluateCriteria(criteria, stats)).toBe(true);
  });

  it("single_day_count: returns true when day count met", () => {
    const criteria: BadgeCriteria = { type: "single_day_count", value: { action: "complete_task", count: 3 } };
    const stats = { today_counts: { complete_task: 3 } };
    expect(evaluateCriteria(criteria, stats)).toBe(true);
  });

  it("consecutive_action: returns true when consecutive count met", () => {
    const criteria: BadgeCriteria = { type: "consecutive_action", value: { action: "complete_on_time", count: 5 } };
    const stats = { consecutive_counts: { complete_on_time: 5 } };
    expect(evaluateCriteria(criteria, stats)).toBe(true);
  });

  it("compound AND: returns true only when all criteria met", () => {
    const criteria: BadgeCriteria = {
      type: "compound",
      value: {
        operator: "AND",
        criteria: [
          { type: "count_action", value: { action: "complete_task", count: 10 } },
          { type: "total_points", value: { count: 50 } },
        ],
      },
    };
    const stats = { action_counts: { complete_task: 10 }, total_points: 60 };
    expect(evaluateCriteria(criteria, stats)).toBe(true);
  });

  it("compound AND: returns false when any criteria not met", () => {
    const criteria: BadgeCriteria = {
      type: "compound",
      value: {
        operator: "AND",
        criteria: [
          { type: "count_action", value: { action: "complete_task", count: 10 } },
          { type: "total_points", value: { count: 50 } },
        ],
      },
    };
    const stats = { action_counts: { complete_task: 10 }, total_points: 30 };
    expect(evaluateCriteria(criteria, stats)).toBe(false);
  });

  it("compound OR: returns true when any criteria met", () => {
    const criteria: BadgeCriteria = {
      type: "compound",
      value: {
        operator: "OR",
        criteria: [
          { type: "count_action", value: { action: "complete_task", count: 10 } },
          { type: "total_points", value: { count: 50 } },
        ],
      },
    };
    const stats = { action_counts: { complete_task: 3 }, total_points: 60 };
    expect(evaluateCriteria(criteria, stats)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/badges.test.ts
```

- [ ] **Step 3: Implement badge criteria engine**

```typescript
// src/lib/badges.ts

export type BadgeCriteria =
  | { type: "count_action"; value: { action: string; count: number } }
  | { type: "streak_milestone"; value: { streak_type: string; count: number } }
  | { type: "consecutive_action"; value: { action: string; count: number } }
  | { type: "single_day_count"; value: { action: string; count: number } }
  | { type: "total_points"; value: { count: number } }
  | { type: "compound"; value: { operator: "AND" | "OR"; criteria: BadgeCriteria[] } };

export type UserStats = {
  action_counts?: Record<string, number>;
  total_points?: number;
  streaks?: Record<string, number>;
  today_counts?: Record<string, number>;
  consecutive_counts?: Record<string, number>;
};

export function evaluateCriteria(criteria: BadgeCriteria, stats: UserStats): boolean {
  switch (criteria.type) {
    case "count_action":
      return (stats.action_counts?.[criteria.value.action] ?? 0) >= criteria.value.count;

    case "total_points":
      return (stats.total_points ?? 0) >= criteria.value.count;

    case "streak_milestone":
      return (stats.streaks?.[criteria.value.streak_type] ?? 0) >= criteria.value.count;

    case "single_day_count":
      return (stats.today_counts?.[criteria.value.action] ?? 0) >= criteria.value.count;

    case "consecutive_action":
      return (stats.consecutive_counts?.[criteria.value.action] ?? 0) >= criteria.value.count;

    case "compound": {
      const results = criteria.value.criteria.map((c) => evaluateCriteria(c, stats));
      return criteria.value.operator === "AND"
        ? results.every(Boolean)
        : results.some(Boolean);
    }

    default:
      return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/badges.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/badges.ts __tests__/lib/badges.test.ts
git commit -m "feat: add badge criteria evaluation engine with TDD"
```

---

### Task 8: Backlog Forecasting

**Files:**
- Create: `src/lib/forecasting.ts`, `__tests__/lib/forecasting.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/forecasting.test.ts
import { getWeeklyThroughput, calculateBacklogForecast, formatForecast } from "@/lib/forecasting";

const EFFORT_POINTS = { small: 1, medium: 3, large: 5 };

describe("getWeeklyThroughput", () => {
  it("calculates average effort points per week over 4 weeks", () => {
    // 4 weeks: completed 2 small (2), 1 medium (3), 1 large (5) = 10 total
    const completedTasks = [
      { effortEstimate: "small" as const, completedAt: new Date("2026-03-02") },
      { effortEstimate: "small" as const, completedAt: new Date("2026-03-09") },
      { effortEstimate: "medium" as const, completedAt: new Date("2026-03-16") },
      { effortEstimate: "large" as const, completedAt: new Date("2026-03-20") },
    ];
    const now = new Date("2026-03-23");
    expect(getWeeklyThroughput(completedTasks, now)).toBe(2.5); // 10 / 4
  });

  it("returns 0 when no tasks completed", () => {
    expect(getWeeklyThroughput([], new Date())).toBe(0);
  });
});

describe("calculateBacklogForecast", () => {
  it("calculates weeks to start for each backlog item", () => {
    const backlog = [
      { id: "1", effortEstimate: "medium" as const, backlogPosition: 1 },
      { id: "2", effortEstimate: "large" as const, backlogPosition: 2 },
      { id: "3", effortEstimate: "small" as const, backlogPosition: 3 },
    ];
    const weeklyThroughput = 5;
    const result = calculateBacklogForecast(backlog, weeklyThroughput);

    expect(result[0]).toEqual({ id: "1", effortAhead: 0, weeksToStart: 0 });
    expect(result[1]).toEqual({ id: "2", effortAhead: 3, weeksToStart: 0.6 });
    expect(result[2]).toEqual({ id: "3", effortAhead: 8, weeksToStart: 1.6 });
  });

  it("returns null weeks when throughput is 0", () => {
    const backlog = [{ id: "1", effortEstimate: "medium" as const, backlogPosition: 1 }];
    const result = calculateBacklogForecast(backlog, 0);
    expect(result[0].weeksToStart).toBeNull();
  });
});

describe("formatForecast", () => {
  it("formats small week counts", () => {
    expect(formatForecast(0.5)).toBe("< 1 week");
  });

  it("formats 1-2 weeks", () => {
    expect(formatForecast(1.5)).toBe("~1-2 weeks");
  });

  it("formats 2-3 weeks", () => {
    expect(formatForecast(2.5)).toBe("~2-3 weeks");
  });

  it("formats 3-4 weeks", () => {
    expect(formatForecast(3.5)).toBe("~3-4 weeks");
  });

  it("formats months", () => {
    expect(formatForecast(6)).toBe("~1-2 months");
  });

  it("returns unknown for null", () => {
    expect(formatForecast(null)).toBe("Unknown");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/forecasting.test.ts
```

- [ ] **Step 3: Implement forecasting**

```typescript
// src/lib/forecasting.ts

const EFFORT_POINTS: Record<string, number> = {
  small: 1,
  medium: 3,
  large: 5,
};

type CompletedTask = {
  effortEstimate: string;
  completedAt: Date;
};

type BacklogItem = {
  id: string;
  effortEstimate: string;
  backlogPosition: number;
};

type ForecastResult = {
  id: string;
  effortAhead: number;
  weeksToStart: number | null;
};

export function getEffortPoints(estimate: string): number {
  return EFFORT_POINTS[estimate] ?? 1;
}

export function getWeeklyThroughput(completedTasks: CompletedTask[], now: Date): number {
  const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000);
  const recentTasks = completedTasks.filter(
    (t) => t.completedAt >= fourWeeksAgo && t.completedAt <= now
  );
  const totalEffort = recentTasks.reduce((sum, t) => sum + getEffortPoints(t.effortEstimate), 0);
  return totalEffort / 4;
}

export function calculateBacklogForecast(
  backlog: BacklogItem[],
  weeklyThroughput: number
): ForecastResult[] {
  const sorted = [...backlog].sort((a, b) => a.backlogPosition - b.backlogPosition);
  let cumulativeEffort = 0;

  return sorted.map((item) => {
    const effortAhead = cumulativeEffort;
    cumulativeEffort += getEffortPoints(item.effortEstimate);
    return {
      id: item.id,
      effortAhead,
      weeksToStart: weeklyThroughput > 0 ? effortAhead / weeklyThroughput : null,
    };
  });
}

export function formatForecast(weeks: number | null): string {
  if (weeks === null) return "Unknown";
  if (weeks < 1) return "< 1 week";
  if (weeks < 2) return "~1-2 weeks";
  if (weeks < 3) return "~2-3 weeks";
  if (weeks < 4) return "~3-4 weeks";
  const months = weeks / 4;
  if (months < 2) return "~1-2 months";
  return `~${Math.floor(months)}-${Math.ceil(months)} months`;
}

export function getBacklogHealth(
  backlog: BacklogItem[],
  weeklyThroughput: number,
  previousBacklogSize?: number
) {
  const totalItems = backlog.length;
  const totalEffort = backlog.reduce((sum, item) => sum + getEffortPoints(item.effortEstimate), 0);
  const estimatedWeeks = weeklyThroughput > 0 ? totalEffort / weeklyThroughput : null;

  // Trend: compare current backlog size to previous period
  let trend: "growing" | "shrinking" | "stable" = "stable";
  if (previousBacklogSize !== undefined) {
    if (totalItems > previousBacklogSize) trend = "growing";
    else if (totalItems < previousBacklogSize) trend = "shrinking";
  }

  return { totalItems, totalEffort, estimatedWeeks, trend };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/forecasting.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/forecasting.ts __tests__/lib/forecasting.test.ts
git commit -m "feat: add backlog forecasting with TDD"
```

---

### Task 9: Permissions Logic

**Files:**
- Create: `src/lib/permissions.ts`, `__tests__/lib/permissions.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// __tests__/lib/permissions.test.ts
import { canEditTask, canDeleteTask, canAccessAdmin, canReorderBacklog, canViewFullReports } from "@/lib/permissions";

const manager = { id: "m1", role: "manager" as const };
const staff = { id: "s1", role: "staff" as const };

describe("canEditTask", () => {
  it("manager can edit any task", () => {
    expect(canEditTask(manager, { createdById: "other", assignedToId: "other" })).toBe(true);
  });

  it("staff can edit tasks assigned to them", () => {
    expect(canEditTask(staff, { createdById: "other", assignedToId: "s1" })).toBe(true);
  });

  it("staff can edit tasks they created", () => {
    expect(canEditTask(staff, { createdById: "s1", assignedToId: "other" })).toBe(true);
  });

  it("staff cannot edit tasks they did not create and are not assigned to", () => {
    expect(canEditTask(staff, { createdById: "other", assignedToId: "other" })).toBe(false);
  });
});

describe("canDeleteTask", () => {
  it("manager can delete any task", () => {
    expect(canDeleteTask(manager)).toBe(true);
  });

  it("staff cannot delete tasks", () => {
    expect(canDeleteTask(staff)).toBe(false);
  });
});

describe("role-based access", () => {
  it("manager can access admin", () => {
    expect(canAccessAdmin(manager)).toBe(true);
  });

  it("staff cannot access admin", () => {
    expect(canAccessAdmin(staff)).toBe(false);
  });

  it("manager can reorder backlog", () => {
    expect(canReorderBacklog(manager)).toBe(true);
  });

  it("staff cannot reorder backlog", () => {
    expect(canReorderBacklog(staff)).toBe(false);
  });

  it("manager can view full reports", () => {
    expect(canViewFullReports(manager)).toBe(true);
  });

  it("staff cannot view full reports", () => {
    expect(canViewFullReports(staff)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- __tests__/lib/permissions.test.ts
```

- [ ] **Step 3: Implement permissions**

```typescript
// src/lib/permissions.ts
type UserContext = {
  id: string;
  role: "manager" | "staff";
};

type TaskContext = {
  createdById: string;
  assignedToId: string | null;
};

export function canEditTask(user: UserContext, task: TaskContext): boolean {
  if (user.role === "manager") return true;
  return task.createdById === user.id || task.assignedToId === user.id;
}

export function canDeleteTask(user: UserContext): boolean {
  return user.role === "manager";
}

export function canAccessAdmin(user: UserContext): boolean {
  return user.role === "manager";
}

export function canReorderBacklog(user: UserContext): boolean {
  return user.role === "manager";
}

export function canViewFullReports(user: UserContext): boolean {
  return user.role === "manager";
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- __tests__/lib/permissions.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/permissions.ts __tests__/lib/permissions.test.ts
git commit -m "feat: add permission logic with TDD"
```

---

### Task 10: Session Management

**Files:**
- Create: `src/lib/session.ts`

- [ ] **Step 1: Implement session helpers**

```typescript
// src/lib/session.ts
import { cookies } from "next/headers";
import { prisma } from "./db";

const SESSION_COOKIE = "repan_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie?.value) return null;

  const user = await prisma.user.findUnique({
    where: { id: sessionCookie.value, isActive: true },
  });
  return user;
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireSession() {
  const user = await getSession();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireManager() {
  const user = await requireSession();
  if (user.role !== "manager") throw new Error("Forbidden");
  return user;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/session.ts
git commit -m "feat: add cookie-based session management"
```

---

## Phase 3: Auth & API Routes

### Task 11: Auth API Routes

**Files:**
- Create: `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`

- [ ] **Step 1: Implement login route**

```typescript
// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { userId } = await request.json();

  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await setSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role, avatarColor: user.avatarColor } });
}
```

- [ ] **Step 2: Implement logout route**

```typescript
// src/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Implement users list route (for login screen)**

```typescript
// src/app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/session";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true, avatarColor: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  await requireManager();
  const { name, role, avatarColor } = await request.json();

  const user = await prisma.user.create({
    data: { name, role: role || "staff", avatarColor },
  });

  return NextResponse.json(user, { status: 201 });
}
```

- [ ] **Step 4: Test login manually**

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" | jq
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"userId":"<id-from-above>"}' -c cookies.txt
```

Expected: Returns user object and sets cookie.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/ src/app/api/users/
git commit -m "feat: add auth and users API routes"
```

---

### Task 12: Task CRUD API Routes

**Files:**
- Create: `src/app/api/tasks/route.ts`, `src/app/api/tasks/[id]/route.ts`, `src/app/api/tasks/[id]/comments/route.ts`, `src/app/api/tasks/[id]/activity/route.ts`
- Create: `src/lib/notifications.ts`

- [ ] **Step 1: Create notification helper**

```typescript
// src/lib/notifications.ts
import { prisma } from "./db";
import { NotificationType } from "@prisma/client";

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  taskId?: string
) {
  return prisma.notification.create({
    data: { userId, type, title, message, taskId },
  });
}
```

- [ ] **Step 2: Implement task list & create routes**

```typescript
// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { sortByUrgency } from "@/lib/urgency";
import { createNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const user = await requireSession();
  const searchParams = request.nextUrl.searchParams;

  const status = searchParams.getAll("status");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");
  const assignedTo = searchParams.get("assignedTo") || user.id;

  const where: any = {
    archivedAt: null,
    assignedToId: assignedTo,
  };

  if (status.length > 0) where.status = { in: status };
  if (priority) where.priority = priority;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Fetch all matching tasks (no pagination) so we can sort by urgency score server-side.
  // For teams up to 30 users, individual task lists are small enough for this approach.
  const tasks = await prisma.task.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, avatarColor: true } },
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  // Sort by calculated urgency score (server-side)
  const sortedTasks = sortByUrgency(
    tasks.map((t) => ({
      ...t,
      priority: t.priority as "high" | "medium" | "low",
      dueDate: t.dueDate,
      createdAt: t.createdAt,
    }))
  );

  return NextResponse.json({ tasks: sortedTasks });
}

export async function POST(request: NextRequest) {
  const user = await requireSession();
  const body = await request.json();

  // Staff can assign tasks to themselves or leave unassigned (backlog).
  // To create a backlog task, staff must explicitly send assignedToId: null.
  // If assignedToId is omitted (undefined), default to self for staff.
  let assignedToId = body.assignedToId !== undefined ? body.assignedToId : null;
  if (user.role === "staff") {
    if (assignedToId && assignedToId !== user.id) {
      return NextResponse.json({ error: "Staff can only assign tasks to themselves" }, { status: 403 });
    }
    if (assignedToId === undefined) assignedToId = user.id; // Default to self for staff
  }

  const task = await prisma.task.create({
    data: {
      title: body.title,
      description: body.description,
      priority: body.priority || "medium",
      effortEstimate: body.effortEstimate || "medium",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      createdById: user.id,
      assignedToId,
      backlogPosition: assignedToId ? null : body.backlogPosition,
    },
    include: {
      createdBy: { select: { id: true, name: true, avatarColor: true } },
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  // Notify assignee if assigned to someone else
  if (task.assignedToId && task.assignedToId !== user.id) {
    await createNotification(
      task.assignedToId,
      "task_assigned",
      "New task assigned",
      `"${task.title}" was assigned to you by ${user.name}`,
      task.id
    );
  }

  return NextResponse.json(task, { status: 201 });
}
```

- [ ] **Step 3: Implement task detail, update, and delete routes**

```typescript
// src/app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { canEditTask, canDeleteTask } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, avatarColor: true } },
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const body = await request.json();

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canEditTask({ id: user.id, role: user.role }, { createdById: task.createdById, assignedToId: task.assignedToId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Build activity log entries for changed fields
  const activities: any[] = [];
  const trackField = (field: string, type: string, oldVal: any, newVal: any) => {
    if (newVal !== undefined && String(oldVal) !== String(newVal)) {
      activities.push({
        taskId: id, userId: user.id, type,
        oldValue: String(oldVal), newValue: String(newVal),
      });
    }
  };

  trackField("status", "status_change", task.status, body.status);
  trackField("priority", "priority_change", task.priority, body.priority);
  trackField("percentComplete", "progress_update", task.percentComplete, body.percentComplete);
  trackField("assignedToId", "assignment_change", task.assignedToId, body.assignedToId);
  trackField("dueDate", "due_date_change", task.dueDate?.toISOString(), body.dueDate);
  trackField("effortEstimate", "effort_change", task.effortEstimate, body.effortEstimate);
  trackField("title", "title_change", task.title, body.title);
  trackField("description", "description_change", task.description, body.description);

  // Handle blocker status changes
  if (body.status === "blocked" && task.status !== "blocked") {
    activities.push({ taskId: id, userId: user.id, type: "blocker_added", content: body.blockerReason });
  }
  if (task.status === "blocked" && body.status && body.status !== "blocked") {
    activities.push({ taskId: id, userId: user.id, type: "blocker_resolved" });
    // Notify assignee that their blocked task is unblocked
    if (task.assignedToId && task.assignedToId !== user.id) {
      await createNotification(
        task.assignedToId,
        "blocker_resolved",
        "Blocker resolved",
        `"${task.title}" is no longer blocked`,
        task.id
      );
    }
  }

  // Build update data
  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.percentComplete !== undefined) updateData.percentComplete = body.percentComplete;
  if (body.effortEstimate !== undefined) updateData.effortEstimate = body.effortEstimate;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.blockerReason !== undefined) updateData.blockerReason = body.blockerReason;
  if (body.assignedToId !== undefined) {
    updateData.assignedToId = body.assignedToId;
    updateData.backlogPosition = body.assignedToId ? null : task.backlogPosition;
  }
  if (body.status === "done") {
    updateData.completedAt = new Date();
    updateData.percentComplete = 100;
  }

  const [updatedTask] = await Promise.all([
    prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, avatarColor: true } },
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
      },
    }),
    activities.length > 0
      ? prisma.taskActivity.createMany({ data: activities })
      : Promise.resolve(),
  ]);

  return NextResponse.json(updatedTask);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;

  if (!canDeleteTask({ id: user.id, role: user.role })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Implement comments route**

```typescript
// src/app/api/tasks/[id]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { createNotification } from "@/lib/notifications";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const { content } = await request.json();

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activity = await prisma.taskActivity.create({
    data: { taskId: id, userId: user.id, type: "comment", content },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
  });

  // Notify task owner if someone else comments
  if (task.assignedToId && task.assignedToId !== user.id) {
    await createNotification(
      task.assignedToId,
      "comment_added",
      "New comment",
      `${user.name} commented on "${task.title}"`,
      task.id
    );
  }

  return NextResponse.json(activity, { status: 201 });
}
```

- [ ] **Step 5: Implement activity log route**

```typescript
// src/app/api/tasks/[id]/activity/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const cursor = searchParams.get("cursor");
  const limit = 20;

  const activities = await prisma.taskActivity.findMany({
    where: { taskId: id },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
    orderBy: { timestamp: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = activities.length > limit;
  const items = hasMore ? activities.slice(0, limit) : activities;

  return NextResponse.json({
    activities: items,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/tasks/ src/lib/notifications.ts
git commit -m "feat: add task CRUD, comments, and activity log API routes"
```

---

### Task 13: Backlog API Routes

**Files:**
- Create: `src/app/api/backlog/route.ts`, `src/app/api/backlog/reorder/route.ts`, `src/app/api/backlog/claim/route.ts`

- [ ] **Step 1: Implement backlog list route**

```typescript
// src/app/api/backlog/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { calculateBacklogForecast, getWeeklyThroughput, getBacklogHealth } from "@/lib/forecasting";

export async function GET() {
  await requireSession();

  const [backlogTasks, completedTasks] = await Promise.all([
    prisma.task.findMany({
      where: { assignedToId: null, archivedAt: null },
      include: {
        createdBy: { select: { id: true, name: true, avatarColor: true } },
      },
      orderBy: { backlogPosition: "asc" },
    }),
    prisma.task.findMany({
      where: {
        status: "done",
        completedAt: { gte: new Date(Date.now() - 28 * 86400000) },
      },
      select: { effortEstimate: true, completedAt: true },
    }),
  ]);

  const now = new Date();
  const weeklyThroughput = getWeeklyThroughput(
    completedTasks.map((t) => ({ effortEstimate: t.effortEstimate, completedAt: t.completedAt! })),
    now
  );

  const forecasts = calculateBacklogForecast(
    backlogTasks.map((t) => ({ id: t.id, effortEstimate: t.effortEstimate, backlogPosition: t.backlogPosition! })),
    weeklyThroughput
  );

  const health = getBacklogHealth(
    backlogTasks.map((t) => ({ id: t.id, effortEstimate: t.effortEstimate, backlogPosition: t.backlogPosition! })),
    weeklyThroughput
  );

  const tasksWithForecasts = backlogTasks.map((task) => ({
    ...task,
    forecast: forecasts.find((f) => f.id === task.id),
  }));

  return NextResponse.json({ tasks: tasksWithForecasts, health, weeklyThroughput });
}
```

- [ ] **Step 2: Implement reorder route**

```typescript
// src/app/api/backlog/reorder/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/session";

export async function PUT(request: NextRequest) {
  await requireManager();
  const { taskIds } = await request.json();

  // Batch update positions
  await prisma.$transaction(
    taskIds.map((id: string, index: number) =>
      prisma.task.update({
        where: { id },
        data: { backlogPosition: index + 1 },
      })
    )
  );

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Implement claim route**

```typescript
// src/app/api/backlog/claim/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const user = await requireSession();
  const { taskId } = await request.json();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (task.assignedToId) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { assignedToId: user.id, backlogPosition: null },
    include: {
      createdBy: { select: { id: true, name: true, avatarColor: true } },
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  // Log the assignment
  await prisma.taskActivity.create({
    data: {
      taskId, userId: user.id, type: "assignment_change",
      oldValue: null, newValue: user.id,
      content: `${user.name} claimed this task from the backlog`,
    },
  });

  return NextResponse.json(updatedTask);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/backlog/
git commit -m "feat: add backlog API routes with forecasting, reorder, and claim"
```

---

### Task 14: Points, Awards, Notifications, Dashboard & Reports API

**Files:**
- Create: `src/app/api/points/route.ts`, `src/app/api/awards/route.ts`, `src/app/api/awards/[id]/route.ts`, `src/app/api/notifications/route.ts`, `src/app/api/dashboard/route.ts`, `src/app/api/reports/route.ts`, `src/app/api/users/[id]/route.ts`

- [ ] **Step 1: Implement points history route**

```typescript
// src/app/api/points/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await requireSession();
  const userId = request.nextUrl.searchParams.get("userId") || user.id;

  const [points, total] = await Promise.all([
    prisma.pointsLedger.findMany({
      where: { userId },
      orderBy: { timestamp: "desc" },
      take: 50,
      include: { task: { select: { id: true, title: true } } },
    }),
    prisma.pointsLedger.aggregate({
      where: { userId },
      _sum: { points: true },
    }),
  ]);

  return NextResponse.json({ points, totalPoints: total._sum.points || 0 });
}
```

- [ ] **Step 2: Implement awards routes**

```typescript
// src/app/api/awards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireManager } from "@/lib/session";

export async function GET() {
  await requireSession();
  const awards = await prisma.award.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(awards);
}

export async function POST(request: NextRequest) {
  await requireManager();
  const body = await request.json();

  const award = await prisma.award.create({
    data: {
      name: body.name,
      description: body.description,
      icon: body.icon,
      criteriaType: body.criteriaType,
      criteriaValue: body.criteriaValue,
    },
  });

  return NextResponse.json(award, { status: 201 });
}
```

```typescript
// src/app/api/awards/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/session";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;
  const body = await request.json();

  const award = await prisma.award.update({
    where: { id },
    data: body,
  });

  return NextResponse.json(award);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;

  // Soft-delete: retire the badge rather than hard delete
  const award = await prisma.award.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json(award);
}
```

- [ ] **Step 3: Implement notifications route**

```typescript
// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET() {
  const user = await requireSession();

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const user = await requireSession();
  const { notificationIds } = await request.json();

  await prisma.notification.updateMany({
    where: { id: { in: notificationIds }, userId: user.id },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 4: Implement dashboard route**

```typescript
// src/app/api/dashboard/route.ts
import { NextResponse } from "next/server";
import { requireManager } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getWeeklyThroughput, getBacklogHealth } from "@/lib/forecasting";

export async function GET() {
  await requireManager();

  const oneWeekAgo = new Date(Date.now() - 7 * 86400000);

  const [users, tasks, backlogTasks, recentActivity, completedRecent, previousBacklogSize] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, avatarColor: true } }),
    prisma.task.findMany({ where: { archivedAt: null, status: { not: "done" } }, include: { assignedTo: { select: { id: true, name: true } } } }),
    prisma.task.findMany({ where: { assignedToId: null, archivedAt: null }, select: { id: true, effortEstimate: true, backlogPosition: true } }),
    prisma.taskActivity.findMany({ orderBy: { timestamp: "desc" }, take: 50, include: { user: { select: { name: true, avatarColor: true } }, task: { select: { id: true, title: true } } } }),
    prisma.task.findMany({ where: { status: "done", completedAt: { gte: new Date(Date.now() - 56 * 86400000) } }, select: { effortEstimate: true, completedAt: true } }),
    // Previous backlog size: unassigned tasks that existed a week ago
    prisma.task.count({ where: { assignedToId: null, archivedAt: null, createdAt: { lte: oneWeekAgo } } }),
  ]);

  // Workload: tasks per person
  const workload = users.map((u) => ({
    user: u,
    tasks: tasks.filter((t) => t.assignedTo?.id === u.id),
    taskCount: tasks.filter((t) => t.assignedTo?.id === u.id).length,
  }));

  // At-risk items
  const now = new Date();
  const atRisk = tasks.filter((t) => {
    if (t.status === "blocked" || t.status === "stalled") return true;
    if (t.dueDate && t.dueDate < now) return true;
    return false;
  });

  // Backlog health
  const throughput = getWeeklyThroughput(
    completedRecent.map((t) => ({ effortEstimate: t.effortEstimate, completedAt: t.completedAt! })),
    now
  );
  const health = getBacklogHealth(
    backlogTasks.map((t) => ({ id: t.id, effortEstimate: t.effortEstimate, backlogPosition: t.backlogPosition! })),
    throughput,
    previousBacklogSize
  );

  // Weekly throughput for chart (last 8 weeks)
  const weeklyData: { week: string; points: number }[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
    const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
    const weekTasks = completedRecent.filter(
      (t) => t.completedAt! >= weekStart && t.completedAt! < weekEnd
    );
    const points = weekTasks.reduce((sum, t) => {
      const effortMap: Record<string, number> = { small: 1, medium: 3, large: 5 };
      return sum + (effortMap[t.effortEstimate] ?? 1);
    }, 0);
    weeklyData.push({ week: weekStart.toISOString().split("T")[0], points });
  }

  return NextResponse.json({ workload, atRisk, backlogHealth: health, weeklyThroughput: weeklyData, recentActivity });
}
```

- [ ] **Step 5: Implement reports route**

```typescript
// src/app/api/reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { canViewFullReports } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const user = await requireSession();
  const period = request.nextUrl.searchParams.get("period") || "weekly";
  const daysBack = period === "monthly" ? 30 : 7;
  const since = new Date(Date.now() - daysBack * 86400000);

  // Calculate the previous period start for backlog delta
  const previousPeriodStart = new Date(since.getTime() - daysBack * 86400000);

  const [completed, created, backlogCount, overdue, previousPeriodBacklogTasks] = await Promise.all([
    prisma.task.findMany({
      where: { status: "done", completedAt: { gte: since } },
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
    prisma.task.count({ where: { createdAt: { gte: since } } }),
    prisma.task.count({ where: { assignedToId: null, archivedAt: null } }),
    // Overdue / missed deadline count
    prisma.task.count({
      where: {
        completedAt: { gte: since },
        status: "done",
        dueDate: { not: null },
        // completedAt > dueDate (completed after deadline)
      },
    }),
    // For backlog delta: count tasks that were in backlog at start of previous period
    // Approximation: tasks created before the period that are still unassigned
    prisma.task.count({
      where: { assignedToId: null, archivedAt: null, createdAt: { lte: since } },
    }),
  ]);

  // Count tasks that actually missed their deadline (completed after due date)
  const missedDeadlines = completed.filter(
    (t) => t.dueDate && t.completedAt && t.completedAt > t.dueDate
  ).length;

  // Backlog delta: current backlog vs estimated previous backlog
  const backlogDelta = backlogCount - previousPeriodBacklogTasks;

  const summary = {
    tasksCompleted: completed.length,
    tasksCreated: created,
    backlogSize: backlogCount,
    backlogDelta,
    missedDeadlines,
    period,
  };

  // Per-person breakdown (manager only)
  let perPerson = null;
  if (canViewFullReports({ id: user.id, role: user.role })) {
    const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } });
    perPerson = await Promise.all(
      users.map(async (u) => {
        const [tasksDone, points] = await Promise.all([
          prisma.task.count({ where: { assignedToId: u.id, status: "done", completedAt: { gte: since } } }),
          prisma.pointsLedger.aggregate({ where: { userId: u.id, timestamp: { gte: since } }, _sum: { points: true } }),
        ]);
        return { user: u, tasksCompleted: tasksDone, pointsEarned: points._sum.points || 0 };
      })
    );
  }

  return NextResponse.json({ summary, perPerson });
}
```

- [ ] **Step 6: Implement user detail route**

```typescript
// src/app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, requireManager } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      userAwards: { include: { award: true }, orderBy: { earnedAt: "desc" } },
      streaks: true,
    },
  });

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [totalPoints, taskStats, completedWithDates] = await Promise.all([
    prisma.pointsLedger.aggregate({ where: { userId: id }, _sum: { points: true } }),
    prisma.task.groupBy({
      by: ["status"],
      where: { assignedToId: id, archivedAt: null },
      _count: true,
    }),
    // For on-time rate and average completion time
    prisma.task.findMany({
      where: { assignedToId: id, status: "done", completedAt: { not: null } },
      select: { createdAt: true, completedAt: true, dueDate: true },
    }),
  ]);

  // Calculate on-time rate
  const tasksWithDueDates = completedWithDates.filter((t) => t.dueDate);
  const onTimeTasks = tasksWithDueDates.filter((t) => t.completedAt! <= t.dueDate!);
  const onTimeRate = tasksWithDueDates.length > 0 ? onTimeTasks.length / tasksWithDueDates.length : null;

  // Calculate average completion time (days from creation to completion)
  const completionTimes = completedWithDates.map(
    (t) => (t.completedAt!.getTime() - t.createdAt.getTime()) / 86400000
  );
  const avgCompletionDays = completionTimes.length > 0
    ? completionTimes.reduce((sum, d) => sum + d, 0) / completionTimes.length
    : null;

  return NextResponse.json({
    ...user,
    totalPoints: totalPoints._sum.points || 0,
    taskStats,
    onTimeRate,
    avgCompletionDays,
    totalCompleted: completedWithDates.length,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;
  const body = await request.json();

  const user = await prisma.user.update({ where: { id }, data: body });
  return NextResponse.json(user);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireManager();
  const { id } = await params;

  // Soft-delete: deactivate the user
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json(user);
}
```

- [ ] **Step 7: Commit**

```bash
git add src/app/api/
git commit -m "feat: add points, awards, notifications, dashboard, reports, and user detail API routes"
```

---

## Phase 4: Frontend UI

### Task 15: App Layout & Login Page

**Files:**
- Create: `src/app/layout.tsx` (modify), `src/app/(auth)/login/page.tsx`, `src/components/layout/header.tsx`, `src/components/layout/nav.tsx`, `src/components/notifications/notification-bell.tsx`, `src/components/notifications/notification-dropdown.tsx`

- [ ] **Step 1: Create the SWR provider and layout wrapper**

Create `src/components/providers.tsx`:

```typescript
"use client";
import { SWRConfig } from "swr";
import { ReactNode } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: true }}>
      {children}
    </SWRConfig>
  );
}
```

- [ ] **Step 2: Create the notification bell component**

Create `src/components/notifications/notification-bell.tsx` — bell icon with unread count badge, dropdown showing notifications, click to mark as read.

- [ ] **Step 3: Create the header component**

Create `src/components/layout/header.tsx` — app name, navigation links (My Tasks, Backlog, Team, Dashboard [manager], Reports, Admin [manager]), user avatar with name, Switch User button, notification bell.

- [ ] **Step 4: Create the nav component**

Create `src/components/layout/nav.tsx` — responsive sidebar/top navigation.

- [ ] **Step 5: Update root layout**

Modify `src/app/layout.tsx` to include the Providers wrapper and the header/nav for authenticated users.

- [ ] **Step 6: Create login page**

Create `src/app/(auth)/login/page.tsx` — grid of user avatars. Each is a card with the avatar circle (colored), user name, and role badge. Click sets the session cookie via `/api/auth/login` and redirects to `/tasks`.

- [ ] **Step 7: Create middleware for auth redirect**

Create `src/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("repan_session");
  const isLoginPage = request.nextUrl.pathname === "/login";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api");

  if (!session && !isLoginPage && !isApiRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (session && isLoginPage) {
    return NextResponse.redirect(new URL("/tasks", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 8: Test login flow manually**

Start dev server, navigate to http://localhost:3000. Should redirect to /login. Click a user avatar. Should redirect to /tasks.

- [ ] **Step 9: Commit**

```bash
git add src/
git commit -m "feat: add app layout, header, navigation, login page, and auth middleware"
```

---

### Task 16: My Tasks Page & Task Components

**Files:**
- Create: `src/app/tasks/page.tsx`, `src/components/tasks/task-card.tsx`, `src/components/tasks/task-filters.tsx`, `src/components/tasks/priority-badge.tsx`, `src/components/tasks/status-badge.tsx`, `src/components/tasks/progress-slider.tsx`, `src/components/gamification/points-summary.tsx`, `src/components/gamification/streak-flame.tsx`, `src/components/gamification/celebration.tsx`, `src/components/gamification/points-popup.tsx`

- [ ] **Step 1: Create priority and status badge components**

`src/components/tasks/priority-badge.tsx` — colored badge: red for high, yellow for medium, green for low.

`src/components/tasks/status-badge.tsx` — pill with icon: gray for not_started, blue for in_progress, red for blocked, orange for stalled, green for done.

- [ ] **Step 2: Create progress slider component**

`src/components/tasks/progress-slider.tsx` — shadcn slider 0-100, displays percentage, calls PATCH on change (debounced).

- [ ] **Step 3: Create streak flame and points summary components**

`src/components/gamification/streak-flame.tsx` — flame emoji/icon with count.

`src/components/gamification/points-summary.tsx` — displays total points, current streaks, in a compact bar.

- [ ] **Step 4: Create celebration animation component**

`src/components/gamification/celebration.tsx` — Framer Motion confetti burst triggered on task completion.

`src/components/gamification/points-popup.tsx` — Floating "+10" animation using Framer Motion.

- [ ] **Step 5: Create task card component**

`src/components/tasks/task-card.tsx` — card showing title, status badge, priority badge, due date (red if overdue), progress bar, quick action buttons (mark done, update progress, flag blocked, add quick comment). Mark done triggers celebration.

- [ ] **Step 6: Create task filters component**

`src/components/tasks/task-filters.tsx` — row of filter controls: status multi-select, priority select, due date range, search text input. Updates URL search params.

- [ ] **Step 7: Create My Tasks page**

`src/app/tasks/page.tsx` — points summary bar at top, task filters, task card list sorted by urgency score (calculated server-side in the API). Uses SWR to fetch from `/api/tasks`. Includes "Create Task" button linking to `/tasks/new`.

- [ ] **Step 8: Test My Tasks page manually**

Navigate to /tasks after login. Should show seeded tasks with filters and sorting.

- [ ] **Step 9: Commit**

```bash
git add src/
git commit -m "feat: add My Tasks page with task cards, filters, gamification summary"
```

---

### Task 17: Task Detail/Edit & Create Task Pages

**Files:**
- Create: `src/app/tasks/[id]/page.tsx`, `src/app/tasks/new/page.tsx`, `src/components/tasks/task-form.tsx`, `src/components/tasks/activity-log.tsx`, `src/components/tasks/comment-box.tsx`

- [ ] **Step 1: Create task form component**

`src/components/tasks/task-form.tsx` — form with all editable fields: title, description (textarea), priority (select), effort estimate (select), due date (date picker), status (select), assigned to (select from users), blocker reason (shown when status is blocked). Used for both create and edit.

- [ ] **Step 2: Create activity log component**

`src/components/tasks/activity-log.tsx` — chronological list of activity entries. Each shows: user avatar, user name, what changed (formatted nicely, e.g., "changed status from In Progress to Done"), timestamp. Comments show the full comment text. Cursor-based pagination with "Load more" button.

- [ ] **Step 3: Create comment box component**

`src/components/tasks/comment-box.tsx` — textarea with submit button. Posts to `/api/tasks/[id]/comments`. Clears on submit and refreshes activity log.

- [ ] **Step 4: Create task detail page**

`src/app/tasks/[id]/page.tsx` — full task detail view. Task form in edit mode (inline editable fields). Activity log below. Comment box at bottom. Shows created by, assigned to, dates. Saves changes via PATCH to `/api/tasks/[id]`. Checks permissions before showing edit controls.

- [ ] **Step 5: Create new task page**

`src/app/tasks/new/page.tsx` — task form in create mode. Posts to `/api/tasks`. Redirects to task detail on success.

- [ ] **Step 6: Test task creation and editing manually**

Create a new task, edit fields, add comments, verify activity log.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add task detail/edit page, create task page, activity log, comments"
```

---

### Task 18: Backlog Page

**Files:**
- Create: `src/app/backlog/page.tsx`, `src/components/backlog/backlog-list.tsx`, `src/components/backlog/forecast-badge.tsx`, `src/components/backlog/backlog-summary.tsx`

- [ ] **Step 1: Create forecast badge component**

`src/components/backlog/forecast-badge.tsx` — displays formatted forecast (e.g., "~2-3 weeks") using `formatForecast` from lib.

- [ ] **Step 2: Create backlog summary component**

`src/components/backlog/backlog-summary.tsx` — bar showing: total items count, total effort points, estimated weeks of work, trend indicator (up/down arrow).

- [ ] **Step 3: Create backlog list component**

`src/components/backlog/backlog-list.tsx` — list of backlog items. Each shows: title, priority badge, effort estimate, forecast badge. Staff see a "Claim" button. Manager sees drag handles for reordering (use `@dnd-kit/core` or HTML5 drag-and-drop). On reorder, calls PUT `/api/backlog/reorder` with optimistic UI.

Install if using dnd-kit: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`

- [ ] **Step 4: Create backlog page**

`src/app/backlog/page.tsx` — backlog summary at top, backlog list below. Fetches from `/api/backlog`.

- [ ] **Step 5: Test backlog page manually**

View backlog, claim an item (as staff), reorder (as manager). Verify forecasts display.

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: add backlog page with forecasting, claim, and drag-to-reorder"
```

---

### Task 19: Team View & Profile Pages

**Files:**
- Create: `src/app/team/page.tsx`, `src/app/team/[id]/page.tsx`, `src/app/profile/[id]/page.tsx`, `src/components/gamification/badge-grid.tsx`, `src/components/gamification/badge-toast.tsx`

- [ ] **Step 1: Create badge grid component**

`src/components/gamification/badge-grid.tsx` — grid of badge cards. Each shows: icon, name, description, earned date (or locked/grayed out if not earned).

- [ ] **Step 2: Create badge toast component**

`src/components/gamification/badge-toast.tsx` — toast notification using shadcn toast. Shows badge icon, name, description. Triggered when badge is earned.

- [ ] **Step 3: Create team view page**

`src/app/team/page.tsx` — grid of team member cards. Each shows: avatar (colored circle), name, current task count, active streak (flame icon), recent badges (last 30 days). Click navigates to `/team/[id]`.

- [ ] **Step 4: Create team member detail page**

`src/app/team/[id]/page.tsx` — shows the selected team member's task list (same format as My Tasks but read-only).

- [ ] **Step 5: Create profile/achievements page**

`src/app/profile/[id]/page.tsx` — badge grid (earned and unearned), points history list, current streaks with personal bests, stats card (total tasks completed, on-time rate, average completion time). Fetches from `/api/users/[id]` and `/api/points?userId=[id]`.

- [ ] **Step 6: Test team and profile pages manually**

View team grid, click a member, view their tasks. View profile page with badges and stats.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add team view, member detail, and profile/achievements pages"
```

---

### Task 20: Manager Dashboard

**Files:**
- Create: `src/app/dashboard/page.tsx`, `src/components/dashboard/workload-chart.tsx`, `src/components/dashboard/at-risk-list.tsx`, `src/components/dashboard/backlog-health.tsx`, `src/components/dashboard/throughput-chart.tsx`, `src/components/dashboard/activity-feed.tsx`

- [ ] **Step 1: Create workload chart component**

`src/components/dashboard/workload-chart.tsx` — Recharts horizontal bar chart. One bar per team member. Stacked by priority (red=high, yellow=medium, green=low).

- [ ] **Step 2: Create at-risk list component**

`src/components/dashboard/at-risk-list.tsx` — list of overdue, blocked, and stalled tasks. Each shows: title, assignee, status badge, days overdue (if applicable). Sorted by severity. Click navigates to task detail.

- [ ] **Step 3: Create backlog health widget**

`src/components/dashboard/backlog-health.tsx` — card showing: total items, total effort points, estimated weeks, trend arrow (comparing to previous period).

- [ ] **Step 4: Create throughput chart component**

`src/components/dashboard/throughput-chart.tsx` — Recharts line chart. X-axis: weeks (last 8). Y-axis: effort points completed.

- [ ] **Step 5: Create activity feed component**

`src/components/dashboard/activity-feed.tsx` — scrollable list of recent activity across all tasks. Each entry: user avatar, action description, task title (linked), timestamp. "Load more" button.

- [ ] **Step 6: Create dashboard page**

`src/app/dashboard/page.tsx` — manager-only page (redirect if staff). Grid layout: workload chart (top-left), at-risk list (top-right), backlog health (middle-left), throughput chart (middle-right), activity feed (bottom full width). Fetches from `/api/dashboard`.

- [ ] **Step 7: Test dashboard manually**

Log in as manager, navigate to /dashboard. Verify all widgets render with seeded data.

- [ ] **Step 8: Commit**

```bash
git add src/
git commit -m "feat: add manager dashboard with workload, at-risk, throughput, and activity widgets"
```

---

### Task 21: Reports Page

**Files:**
- Create: `src/app/reports/page.tsx`, `src/components/reports/report-summary.tsx`, `src/components/reports/throughput-trend.tsx`, `src/components/reports/contribution-table.tsx`

- [ ] **Step 1: Create report summary component**

`src/components/reports/report-summary.tsx` — card grid showing: tasks completed, tasks created, backlog size, backlog delta.

- [ ] **Step 2: Create throughput trend component**

`src/components/reports/throughput-trend.tsx` — Recharts line chart of throughput over time.

- [ ] **Step 3: Create contribution table component**

`src/components/reports/contribution-table.tsx` — table with columns: Name, Tasks Completed, Points Earned. Only shown to managers. Staff see a message: "Team summary view — per-person details available to managers."

- [ ] **Step 4: Create reports page**

`src/app/reports/page.tsx` — period toggle (Weekly / Monthly), report summary cards, throughput trend chart, contribution table (manager only). Print button that triggers `window.print()`. Fetches from `/api/reports`.

- [ ] **Step 5: Add print-optimized CSS**

Add `@media print` styles to the reports page: hide navigation, format tables for print, clean layout.

- [ ] **Step 6: Test reports page manually**

View as manager (full detail) and as staff (summary only). Test print-to-PDF.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add reports page with summary, throughput trend, and print-to-PDF"
```

---

### Task 22: Admin Panel

**Files:**
- Create: `src/app/admin/page.tsx`, `src/app/admin/badges/page.tsx`, `src/components/admin/user-form.tsx`, `src/components/admin/badge-form.tsx`

- [ ] **Step 1: Create user form component**

`src/components/admin/user-form.tsx` — form with: name input, role select (manager/staff), avatar color picker (predefined color swatches). Used for create and edit. Edit mode also shows a "Deactivate" button.

- [ ] **Step 2: Create badge form component**

`src/components/admin/badge-form.tsx` — form with: name, description, icon (text input or picker), criteria type (dropdown), criteria value (dynamic form fields based on type). For `count_action`: action dropdown + count input. For `streak_milestone`: streak type dropdown + count input. For `total_points`: count input. For `compound`: nested criteria builder.

- [ ] **Step 3: Create admin users page**

`src/app/admin/page.tsx` — manager-only page. Table of all users (active and inactive). Create User button opens dialog with user form. Click a user to edit. Shows user's role, status, creation date.

- [ ] **Step 4: Create admin badges page**

`src/app/admin/badges/page.tsx` — table of all badge definitions. Create Badge button opens dialog with badge form. Each row shows: icon, name, description, criteria summary, active/retired status. Edit and retire buttons.

- [ ] **Step 5: Add admin navigation tabs**

Admin page has tabs: Users | Badges. Tab navigation between `/admin` and `/admin/badges`.

- [ ] **Step 6: Test admin panel manually**

Create a user, edit a user, deactivate a user. Create a badge, edit a badge, retire a badge.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add admin panel with user management and badge management"
```

---

## Phase 5: Gamification Integration

### Task 23: Points & Badge Awarding on Task Actions

**Files:**
- Create: `src/lib/gamification.ts`
- Modify: `src/app/api/tasks/[id]/route.ts`, `src/app/api/tasks/[id]/comments/route.ts`, `src/app/api/backlog/claim/route.ts`

This task wires up the points, streaks, and badge evaluation to actually fire when task actions happen.

- [ ] **Step 1: Create gamification orchestrator**

`src/lib/gamification.ts` — central function that takes an action and user, awards points (respecting anti-gaming rules), updates streaks, evaluates badges, and creates notifications for new badges.

```typescript
// src/lib/gamification.ts
import { prisma } from "./db";
import { calculatePoints, PointAction } from "./points";
import { shouldIncrementStreak, shouldResetStreak, isStreakMilestone } from "./streaks";
import { evaluateCriteria, BadgeCriteria, UserStats } from "./badges";
import { createNotification } from "./notifications";

export async function awardAction(userId: string, action: PointAction, taskId?: string) {
  const points = calculatePoints(action);

  // Check anti-gaming rules
  if (action.action === "progress_update" && taskId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existing = await prisma.pointsLedger.count({
      where: { userId, taskId, actionType: "progress_update", timestamp: { gte: today } },
    });
    if (existing >= 1) return; // Already got points for this task today
  }

  if (action.action === "comment") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCommentPoints = await prisma.pointsLedger.aggregate({
      where: { userId, actionType: "comment", timestamp: { gte: today } },
      _sum: { points: true },
    });
    if ((todayCommentPoints._sum.points || 0) >= 5) return; // Daily cap reached
  }

  // Award points
  if (points > 0) {
    await prisma.pointsLedger.create({
      data: { userId, taskId, actionType: action.action, points },
    });
  }

  // Update streaks
  await updateStreaksForAction(userId, action.action);

  // Evaluate badges
  await evaluateNewBadges(userId);
}

async function updateStreaksForAction(userId: string, actionType: string) {
  const now = new Date();

  // Daily check-in streak (any task interaction)
  const dailyStreak = await prisma.streak.findUnique({
    where: { userId_streakType: { userId, streakType: "daily_checkin" } },
  });

  if (dailyStreak) {
    if (shouldResetStreak("daily_checkin", dailyStreak.lastActivity, now)) {
      await prisma.streak.update({
        where: { id: dailyStreak.id },
        data: { currentCount: 1, lastActivity: now },
      });
    } else if (shouldIncrementStreak("daily_checkin", dailyStreak.lastActivity, now)) {
      const newCount = dailyStreak.currentCount + 1;
      await prisma.streak.update({
        where: { id: dailyStreak.id },
        data: {
          currentCount: newCount,
          longestCount: Math.max(newCount, dailyStreak.longestCount),
          lastActivity: now,
        },
      });
      if (isStreakMilestone(newCount)) {
        await awardAction(userId, { action: "streak_milestone", streakCount: newCount });
      }
    }
  } else {
    await prisma.streak.create({
      data: { userId, streakType: "daily_checkin", currentCount: 1, longestCount: 1, lastActivity: now },
    });
  }

  // Weekly momentum (on task completion)
  if (actionType === "complete_task") {
    const weeklyStreak = await prisma.streak.findUnique({
      where: { userId_streakType: { userId, streakType: "weekly_momentum" } },
    });

    if (weeklyStreak) {
      if (shouldResetStreak("weekly_momentum", weeklyStreak.lastActivity, now)) {
        await prisma.streak.update({
          where: { id: weeklyStreak.id },
          data: { currentCount: 1, lastActivity: now },
        });
      } else if (shouldIncrementStreak("weekly_momentum", weeklyStreak.lastActivity, now)) {
        const newCount = weeklyStreak.currentCount + 1;
        await prisma.streak.update({
          where: { id: weeklyStreak.id },
          data: {
            currentCount: newCount,
            longestCount: Math.max(newCount, weeklyStreak.longestCount),
            lastActivity: now,
          },
        });
      } else {
        // Same week, just update lastActivity
        await prisma.streak.update({
          where: { id: weeklyStreak.id },
          data: { lastActivity: now },
        });
      }
    } else {
      await prisma.streak.create({
        data: { userId, streakType: "weekly_momentum", currentCount: 1, longestCount: 1, lastActivity: now },
      });
    }
  }
}

// Called specifically when a task with a due date is completed
async function updateOnTimeStreak(userId: string, completedOnTime: boolean) {
  const streak = await prisma.streak.findUnique({
    where: { userId_streakType: { userId, streakType: "on_time_completion" } },
  });

  if (completedOnTime) {
    if (streak) {
      const newCount = streak.currentCount + 1;
      await prisma.streak.update({
        where: { id: streak.id },
        data: {
          currentCount: newCount,
          longestCount: Math.max(newCount, streak.longestCount),
          lastActivity: new Date(),
        },
      });
      if (isStreakMilestone(newCount)) {
        await awardAction(userId, { action: "streak_milestone", streakCount: newCount });
      }
    } else {
      await prisma.streak.create({
        data: { userId, streakType: "on_time_completion", currentCount: 1, longestCount: 1, lastActivity: new Date() },
      });
    }
  } else {
    // Missed deadline breaks the on-time streak
    if (streak && streak.currentCount > 0) {
      await prisma.streak.update({
        where: { id: streak.id },
        data: { currentCount: 0, lastActivity: new Date() },
      });
    }
  }
}

async function evaluateNewBadges(userId: string) {
  const [awards, earnedAwardIds, stats] = await Promise.all([
    prisma.award.findMany({ where: { isActive: true } }),
    prisma.userAward.findMany({ where: { userId }, select: { awardId: true } }),
    getUserStats(userId),
  ]);

  const earnedIds = new Set(earnedAwardIds.map((a) => a.awardId));

  for (const award of awards) {
    if (earnedIds.has(award.id)) continue;

    const criteria = { type: award.criteriaType, value: award.criteriaValue } as BadgeCriteria;
    if (evaluateCriteria(criteria, stats)) {
      await prisma.userAward.create({ data: { userId, awardId: award.id } });
      await createNotification(userId, "badge_earned", "Badge Earned!", `You earned the "${award.name}" badge!`);
    }
  }
}

async function getUserStats(userId: string): Promise<UserStats> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [pointsResult, pointsLedger, streaks, todayLedger] = await Promise.all([
    prisma.pointsLedger.aggregate({ where: { userId }, _sum: { points: true } }),
    prisma.pointsLedger.findMany({ where: { userId } }),
    prisma.streak.findMany({ where: { userId } }),
    prisma.pointsLedger.findMany({ where: { userId, timestamp: { gte: today } } }),
  ]);

  const actionCounts: Record<string, number> = {};
  for (const entry of pointsLedger) {
    actionCounts[entry.actionType] = (actionCounts[entry.actionType] || 0) + 1;
  }

  const todayCounts: Record<string, number> = {};
  for (const entry of todayLedger) {
    todayCounts[entry.actionType] = (todayCounts[entry.actionType] || 0) + 1;
  }

  const streakMap: Record<string, number> = {};
  for (const s of streaks) {
    streakMap[s.streakType] = s.currentCount;
  }

  // Populate consecutive_counts from streak data
  const consecutiveCounts: Record<string, number> = {};
  if (streakMap["on_time_completion"]) {
    consecutiveCounts["complete_on_time"] = streakMap["on_time_completion"];
  }

  return {
    action_counts: actionCounts,
    total_points: pointsResult._sum.points || 0,
    streaks: streakMap,
    today_counts: todayCounts,
    consecutive_counts: consecutiveCounts,
  };
}
```

- [ ] **Step 2: Wire gamification into task PATCH route**

Modify `src/app/api/tasks/[id]/route.ts` PATCH handler to call `awardAction()` after successful updates:

- When status changes to `done`: call `awardAction(userId, { action: "complete_task", effortEstimate })`. If the task has a due date, check if completed on or before the due date: if yes, call `awardAction(userId, { action: "complete_on_time" })` and `updateOnTimeStreak(userId, true)`; if no, call `updateOnTimeStreak(userId, false)` to break the streak.
- When `percentComplete` changes: call `awardAction(userId, { action: "progress_update" }, taskId)`.
- When status changes from `blocked` to something else: call `awardAction(userId, { action: "resolve_blocker" }, taskId)`.

- [ ] **Step 3: Wire gamification into comments route**

Modify `src/app/api/tasks/[id]/comments/route.ts` to call `awardAction(userId, { action: "comment" }, taskId)` after creating a comment.

- [ ] **Step 4: Wire gamification into backlog claim route**

Modify `src/app/api/backlog/claim/route.ts` to call `awardAction(userId, { action: "claim_backlog" }, taskId)` after claiming.

- [ ] **Step 5: Test gamification manually**

Complete a task, verify points appear. Add comments, verify points (and daily cap). Check streaks update. Earn the "First Blood" badge.

- [ ] **Step 6: Commit**

```bash
git add src/lib/gamification.ts src/app/api/
git commit -m "feat: wire gamification engine into task actions — points, streaks, badges"
```

---

## Phase 6: Scheduled Jobs & Missing Pieces

### Task 24: Root Page Redirect & Admin System Settings

**Files:**
- Create: `src/app/page.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Create root page redirect**

```typescript
// src/app/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function Home() {
  const user = await getSession();
  if (user) {
    redirect("/tasks");
  } else {
    redirect("/login");
  }
}
```

- [ ] **Step 2: Add system settings placeholder to admin**

Add a "Settings" tab to the admin page with a placeholder message: "System settings coming soon. Future options: app name, default effort estimates, point values." This satisfies the spec requirement without implementing the full feature.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/app/admin/
git commit -m "feat: add root page redirect and admin settings placeholder"
```

---

### Task 25: Scheduled Maintenance Jobs

**Files:**
- Create: `src/app/api/cron/route.ts`

This route handles periodic maintenance: archiving old completed tasks, purging old notifications, and generating due-date-approaching notifications. It can be called by an external cron service (e.g., `curl http://localhost:3000/api/cron?secret=...`) or manually.

- [ ] **Step 1: Implement cron API route**

```typescript
// src/app/api/cron/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  // Simple secret-based auth for cron jobs
  const secret = request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: Record<string, number> = {};

  // 1. Archive completed tasks older than 90 days
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 86400000);
  const archived = await prisma.task.updateMany({
    where: {
      status: "done",
      completedAt: { lte: ninetyDaysAgo },
      archivedAt: null,
    },
    data: { archivedAt: now },
  });
  results.tasksArchived = archived.count;

  // 2. Purge notifications older than 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const purged = await prisma.notification.deleteMany({
    where: { createdAt: { lte: thirtyDaysAgo } },
  });
  results.notificationsPurged = purged.count;

  // 3. Generate due-date-approaching notifications (tasks due tomorrow)
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const tasksDueTomorrow = await prisma.task.findMany({
    where: {
      dueDate: { gte: tomorrowStart, lte: tomorrowEnd },
      status: { notIn: ["done"] },
      assignedToId: { not: null },
      archivedAt: null,
    },
  });

  let dueDateNotifications = 0;
  for (const task of tasksDueTomorrow) {
    // Check if we already sent this notification today
    const existing = await prisma.notification.findFirst({
      where: {
        userId: task.assignedToId!,
        taskId: task.id,
        type: "due_date_approaching",
        createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
    });
    if (!existing) {
      await createNotification(
        task.assignedToId!,
        "due_date_approaching",
        "Task due tomorrow",
        `"${task.title}" is due tomorrow`,
        task.id
      );
      dueDateNotifications++;
    }
  }
  results.dueDateNotifications = dueDateNotifications;

  return NextResponse.json({ success: true, results });
}
```

- [ ] **Step 2: Add CRON_SECRET to .env.example**

```
CRON_SECRET="your-cron-secret-here"
```

- [ ] **Step 3: Add cron API to file structure documentation**

Add `src/app/api/cron/route.ts` to the API routes list in the file structure section.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/ .env.example
git commit -m "feat: add scheduled maintenance — archival, notification purge, due date warnings"
```

---

## Phase 7: Polish & Completion

### Task 26: Responsive Design & Final Polish

**Files:**
- Modify: various component and page files

- [ ] **Step 1: Add responsive breakpoints to all pages**

Review each page and ensure Tailwind responsive classes are applied:
- Login: 2-column grid on desktop, single column on mobile
- My Tasks: full-width cards on mobile, more compact on desktop
- Task Detail: side-by-side form + activity log on desktop, stacked on mobile
- Backlog: same as My Tasks
- Team: 3-column grid on desktop, 2 on tablet, 1 on mobile
- Dashboard: 2-column grid on desktop, stacked on mobile
- Reports: stacked on mobile, side-by-side charts on desktop
- Admin: full-width table on desktop, card view on mobile

- [ ] **Step 2: Add `.gitignore` entry for `.superpowers/`**

```bash
echo ".superpowers/" >> .gitignore
```

- [ ] **Step 3: Add print CSS for reports**

Add `@media print` styles that hide the header/nav and format the reports page cleanly for PDF export.

- [ ] **Step 4: Final manual testing pass**

Test complete flow: Login → Create task → Edit task → Complete task → Verify points/badges → View backlog → Claim item → View team → View dashboard → View reports → Admin. Test as both manager and staff.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add responsive design, print CSS, and final polish"
```

---

### Task 27: Docker Production Setup

**Files:**
- Create: `Dockerfile`, modify `docker-compose.yml`

- [ ] **Step 1: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=src/prisma/schema.prisma
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/src/prisma ./src/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000
CMD ["node", "server.js"]
```

- [ ] **Step 2: Update docker-compose.yml for production**

```yaml
version: "3.8"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: repan
      POSTGRES_PASSWORD: repan_dev
      POSTGRES_DB: repan
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: "postgresql://repan:repan_dev@db:5432/repan"
    depends_on:
      - db

volumes:
  pgdata:
```

- [ ] **Step 3: Update next.config.ts for standalone output**

Add `output: "standalone"` to the Next.js config.

- [ ] **Step 4: Test Docker build**

```bash
docker compose build
docker compose up
```

Verify app runs at http://localhost:3000 with the database.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile docker-compose.yml next.config.ts
git commit -m "feat: add Docker production setup with multi-stage build"
```
