# Repan

A team task tracker with gamification. Manage tasks with dynamic priority scoring, backlog forecasting, and a points/badges/streaks system that makes getting work done a little more fun.

Built with Next.js, TypeScript, PostgreSQL, Tailwind CSS, and shadcn/ui.

## Features

- **Task Management** -- Create, assign, and track tasks with status, priority, effort estimates, due dates, comments, and activity logs
- **Dynamic Priority** -- Tasks auto-sort by urgency score (priority + due date proximity). Overdue low-priority items bubble up automatically
- **Backlog Forecasting** -- Unassigned tasks show estimated start times based on team throughput ("~2-3 weeks")
- **Gamification** -- Earn points for completing tasks, commenting, resolving blockers, and maintaining streaks. 15 badges to unlock
- **Manager Dashboard** -- Workload distribution, at-risk items, throughput trends, and backlog health at a glance
- **Reports** -- Weekly/monthly summaries with per-person breakdowns (manager view)
- **No Passwords** -- Pick your name to log in. Designed for trusted internal teams

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL)
- npm

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/tmhoule/repan.git
cd repan
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment

```bash
cp .env.example .env
```

The defaults work out of the box with the Docker database.

### 4. Start the database

```bash
docker compose up -d
```

This starts PostgreSQL on port 5432.

### 5. Run database migrations

```bash
npm run migrate
```

This command:
- Generates the Prisma Client
- Runs database migrations to create all tables
- Works without `npx` (production-friendly)

Alternatively, if you have `npx` available, you can use:
```bash
npx prisma migrate deploy
```

### 6. Seed the database

```bash
npx prisma db seed
```

This creates 8 users (1 manager "Todd" + 7 staff), 15 badges, and sample tasks.

### 7. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and pick a user to log in.

## Project Structure

```
src/
  app/           -- Pages and API routes (Next.js App Router)
  components/    -- UI components (tasks, gamification, dashboard, etc.)
  lib/           -- Business logic (urgency scoring, points, badges, streaks, forecasting)
  prisma/        -- Database schema and seed data
```

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm test` | Run tests (60 unit tests) |
| `npm run migrate` | Run database migrations (no npx required) |
| `npx prisma studio` | Browse database in browser |
| `npx prisma db seed` | Re-seed sample data |
| `docker compose up -d` | Start PostgreSQL |
| `docker compose down` | Stop PostgreSQL |

## Docker Production Deploy

```bash
docker compose up --build
```

This builds the app and runs it alongside PostgreSQL. The app is available at port 3000.

The Docker container automatically:
1. Waits for the database to be ready
2. Runs migrations using `node src/scripts/migrate.js` (no `npx` required)
3. Starts the application

### Production Server Setup (without Docker)

If deploying to a production server without `npx`:

1. Set the `DATABASE_URL` environment variable
2. Install dependencies: `npm ci --production`
3. Run migrations: `npm run migrate` or `node src/scripts/migrate.js`
4. Start the app: `npm start`

The migration script automatically:
- Loads environment variables from `.env` if present
- Generates the Prisma Client
- Applies all pending migrations
- Works with just Node.js (no `npx` dependency)

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Data Fetching**: SWR
