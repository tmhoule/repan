# Admin Guide

The Admin panel is accessible to super admins from the user menu (top right). It provides user management, team configuration, badge management, SSO setup, and session settings.

## User Management

### Creating Users

1. Click **Create User**
2. Enter their display name
3. Set a password (or leave blank if using SSO)
4. Choose their team(s)
5. Optionally mark as SSO user (they'll authenticate via SAML instead of password)

### Editing Users

Click any user in the list to edit:
- **Name** — Display name across the app
- **Role** — Manager or Staff (global role)
- **Active** — Toggle to deactivate (prevents login, preserves data)
- **Super Admin** — Only other super admins can grant this
- **Password** — Set or reset (not available for SSO users)

### Deactivating Users

When a user is deactivated:
- They cannot log in
- Their active tasks are returned to the backlog
- Their boulders are archived (not backlogged, since boulders need an owner)
- Their points, badges, and activity history are preserved

## Team Management

### Creating Teams

Super admins can create new teams. Each team is independent with its own:
- Task backlog
- Bucket categories
- Priority weights and multipliers
- Member roster

### Team Settings

Under the **System Settings** section of the Admin panel:

#### Priority Weights

Control how tasks of different priorities contribute to workload calculations:

| Setting | Default | Used in |
|---------|---------|---------|
| High weight | 60 | Dashboard workload, capacity, reports |
| Medium weight | 35 | Dashboard workload, capacity, reports |
| Low weight | 10 | Dashboard workload, capacity, reports |

Higher values mean that priority level contributes more to a person's load score.

#### Status Multipliers

Control how blocked/stalled tasks are weighted:

| Setting | Default | Meaning |
|---------|---------|---------|
| Blocked multiplier | 5% | A blocked high-priority task counts as 3% load instead of 60% |
| Stalled multiplier | 25% | A stalled/paused task counts at 25% of its normal weight |

Lower values mean blocked/stalled work is treated as less of a current burden.

#### Permissions

- **Users can assign tasks to others** — When off (default), only managers can change task assignment. When on, any team member can assign or reassign tasks.

### Managing Members

Add or remove team members and set their team-level role (Manager or Member) from the team management section.

## Badge Management

### Creating Badges

1. Go to the **Badges** tab in Admin
2. Click **Create Badge**
3. Configure:
   - **Name** — Displayed to users
   - **Description** — Explains how to earn it
   - **Icon** — Visual identifier
   - **Criteria Type** — What triggers the award
   - **Criteria Value** — The threshold (e.g., count: 5)
   - **Active** — Whether it can currently be earned

### Criteria Types

| Type | Example |
|------|---------|
| count_action | Complete 10 tasks (`action: "complete_task", count: 10`) |
| streak_milestone | 7-day daily check-in (`streak_type: "daily_checkin", count: 7`) |
| consecutive_action | 5 on-time completions in a row (`action: "complete_on_time", count: 5`) |
| single_day_count | 3 tasks in one day (`action: "complete_task", count: 3`) |
| total_points | Reach 500 points (`count: 500`) |

### Deactivating Badges

Deactivated badges stop being awarded to new users but remain visible on profiles of users who already earned them.

## SSO / SAML Configuration

Repan supports SAML 2.0 for enterprise single sign-on.

### Setup

1. Go to the **SSO** tab in Admin
2. Enter your **App URL** (the base URL users access Repan at)
3. Choose configuration method:
   - **Metadata URL** — Paste your IdP's metadata endpoint
   - **Manual** — Enter IdP entity ID, SSO URL, and X.509 certificate directly
4. Click **Save & Enable SSO**

### IdP Configuration

Configure your identity provider with:
- **ACS URL** — `https://your-app-url/api/auth/saml/callback`
- **SP Entity ID** — Shown in the SSO settings panel
- **NameID format** — Persistent or email

### Attribute Mapping

Repan expects these SAML attributes:
- **UID** — Unique identifier for the user (default: `NameID`)
- **Display Name** — User's display name (default: looks for `displayName`, `name`, or `cn` attributes)

Custom attribute names can be configured in the SSO settings.

### How SSO Login Works

1. User clicks "Sign in with SSO" on the login page
2. Browser redirects to your IdP
3. User authenticates with the IdP
4. IdP posts a SAML response back to Repan's ACS URL
5. Repan validates the response, creates or finds the user, and sets a session
6. If the user has one team, they go to their tasks. Multiple teams go to team select.

### JIT Provisioning

Users who authenticate via SSO for the first time are automatically created (Just-In-Time provisioning). They start with the "staff" role and no team — a manager needs to add them to a team.

SSO users cannot use password login. They must always authenticate through the identity provider.

### Deactivated SSO Users

If an SSO user's account is deactivated in Repan, they'll be blocked at the SAML callback even if the IdP authenticates them. They'll see an "account disabled" error on the login page.

## Session Configuration

Super admins can configure the session idle timeout:

1. Go to the **Session** section in Admin settings
2. Set the timeout in minutes (15 minutes to 30 days)
3. Default: 360 minutes (6 hours)

When a session times out due to inactivity, the user is redirected to the login page. Active usage (clicking, navigating) refreshes the session automatically. The client polls every 5 minutes to detect expired sessions.

## Daily Cron Job

Repan relies on an external scheduler to trigger daily maintenance. Set up a cron job or cloud scheduler to POST to:

```
POST /api/cron
Authorization: Bearer YOUR_CRON_SECRET
```

Set the `CRON_SECRET` environment variable to a strong random string.

The cron job performs:
1. Archives completed tasks older than 90 days
2. Purges notifications older than 30 days
3. Sends due-date-approaching notifications
4. Alerts managers about backlog items due soon
5. Sends weekly risk digests (Mondays only)
6. Records daily workload snapshots for historical reporting
