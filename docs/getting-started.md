# Getting Started

## Running with Docker

The simplest way to run Repan is with Docker Compose:

```bash
docker compose up -d --build
```

This starts two containers:
- **db** — PostgreSQL 16 on port 5432
- **app** — The Repan application on port 3000

The app container automatically waits for the database, runs all pending migrations, and starts the server.

Access the app at **http://localhost:3000**.

## First-Time Setup

On first launch, Repan shows a setup screen to create the initial super admin account:

1. Enter a display name and password (minimum 6 characters)
2. Click **Create Account**

This creates:
- Your super admin user
- A "Default Team" with you as the manager
- The default set of achievement badges

You're now logged in and can start creating tasks or adding team members.

## Production Deployment

Use the production compose file for persistent deployments:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Set these environment variables:
- `SESSION_SECRET` — A strong random string for signing session cookies
- `DISABLE_SECURE_COOKIES` — Set to `"true"` only if not behind HTTPS

The app listens on `127.0.0.1:3000`. Use a reverse proxy (nginx, Apache, Caddy) to add HTTPS and expose it externally.

## Adding Team Members

1. Log in as a manager or super admin
2. Navigate to the **Admin** panel (user menu, top right)
3. Click **Create User**
4. Enter their name, set a password, and assign them to a team
5. They can now log in and start working

For SSO setup, see the [Admin Guide](admin-guide.md).

## Daily Cron Job

Repan has an automated daily job that handles:
- Archiving completed tasks older than 90 days
- Purging old notifications
- Sending due-date reminders
- Weekly risk digests for managers
- Recording workload snapshots for historical reporting

Trigger it with a POST to `/api/cron` with a Bearer token matching the `CRON_SECRET` environment variable. Set up an external scheduler (cron, AWS EventBridge, etc.) to call this once daily.
