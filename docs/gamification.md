# Gamification

Repan includes a points, streaks, and badges system to encourage consistent engagement. All gamification data is visible on user profiles and the team page.

## Points

Points are awarded for productive actions:

| Action | Points | Limit |
|--------|--------|-------|
| Complete a small task | 10 | — |
| Complete a medium task | 15 | — |
| Complete a large task | 25 | — |
| Complete on time (before due date) | 5 | — |
| Update task progress | 2 | 1 per task per day |
| Add a comment | 1 | 5 points per day total |
| Resolve a blocker | 5 | — |
| Claim a backlog task | 3 | — |
| Complete a todo | 1 | — |
| Streak milestone (3 days) | 5 | — |
| Streak milestone (5 days) | 10 | — |
| Streak milestone (10 days) | 20 | — |
| Streak milestone (30 days) | 50 | — |

### Anti-Gaming Rules

To prevent point inflation:
- **Progress updates** are capped at 1 award per task per day. Moving the slider 10 times on the same task in one day only awards points once.
- **Comments** are capped at 5 points per day total. Posting 20 comments still only earns 5 points.

## Streaks

Streaks track consistent activity over time:

### Daily Check-in

Increments whenever you perform any action (update progress, complete a task, add a comment). Resets if you go a full day without any activity. Your current and longest streaks are tracked.

### Weekly Momentum

Increments when you complete a task in a new week. Resets if a full week passes with no completions. Encourages consistent delivery week over week.

### On-Time Completion

Increments each time you complete a task before its due date. Resets when you miss a deadline. Tracks your consecutive on-time deliveries.

### Milestones

Reaching streak milestones (3, 5, 10, 30 days) awards bonus points and may trigger badge achievements.

## Badges

Badges are one-time achievements earned when specific criteria are met. They appear on your profile and in the team view.

### Default Badges

The system ships with 15 default badges:

| Badge | Criteria |
|-------|----------|
| First Blood | Complete your first task |
| Backlog Buster | Claim and complete 5 backlog items |
| Unblocker | Resolve 3 blockers |
| Streak Master | 10-day daily check-in streak |
| Deadline Crusher | 5 tasks completed on time in a row |
| Centurion | Reach 100 total points |
| Commentator | Leave 20 comments |
| Heavy Lifter | Complete 3 large-effort tasks |
| Early Bird | Complete 3 tasks before their due date |
| Team Player | Pick up 10 backlog items |
| Consistency King | 4-week momentum streak |
| Prolific | Complete 25 total tasks |
| Detail Oriented | Update progress 10+ times |
| Rapid Fire | Complete 3 tasks in one day |
| Marathon Runner | 30-day daily check-in streak |

### Custom Badges

Managers can create custom badges from the Admin panel with these criteria types:

- **count_action** — N total actions of a type (e.g., complete 50 tasks)
- **streak_milestone** — Reach N-day streak
- **consecutive_action** — N consecutive occurrences
- **single_day_count** — N actions in a single day
- **total_points** — Reach N total points
- **compound** — Combine criteria with AND/OR logic

Badges can be deactivated without removing them from users who already earned them.

## Points Summary

A compact strip on the tasks page shows:
- Total points earned
- Active daily check-in streak (with flame icon)
- Weekly momentum streak
- On-time completion streak

## Where Gamification Appears

- **Tasks page** — Points summary strip at the top
- **Task card** — Celebration burst animation and points popup on completion
- **Team page** — Points, streaks, and badges per person
- **Profile page** — Full badge collection, streak history, and stats
- **Dashboard** — Recent team achievements section
- **Reports** — Points earned per person in contribution table
