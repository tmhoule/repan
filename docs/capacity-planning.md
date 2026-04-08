# Capacity Planning

The capacity page shows a forward-looking view of each person's workload for this week and next week. Access it from the **Capacity** link in the navigation (manager-only).

## How Load is Calculated

Each person's load is a weighted percentage where 100% means fully utilized. The calculation:

### 1. Priority Weights

Each task contributes based on its priority level. Weights are configurable per team in the Admin panel (defaults shown):

| Priority | Default Weight |
|----------|---------------|
| High | 60% |
| Medium | 35% |
| Low | 10% |

A person with one high-priority task and one low-priority task has a base load of 70%.

### 2. Status Multipliers

Blocked and stalled/paused tasks contribute a reduced percentage of their weight, since the person can't actively work on them:

| Status | Default Multiplier |
|--------|-------------------|
| Blocked | 5% of weight |
| Stalled / Paused | 25% of weight |
| Active (in_progress, not_started) | 100% of weight |

A high-priority blocked task contributes 60% x 5% = 3% instead of the full 60%.

### 3. Remaining Work

The task's percent complete is factored in. A task at 80% complete only contributes 20% of its weighted value. This means load decreases as people make progress.

### 4. Boulder Allocation

Boulder time allocations are added directly. If someone has a 20% on-call boulder, that 20% is added on top of their task-based load.

### 5. Week Scoping

Tasks are split by due date:
- **This Week** — Tasks due within the next 7 days
- **Next Week** — Tasks due in days 8-14

Tasks without a due date are counted separately (shown as "N undated tasks") but not included in the load percentage.

## Reading the Capacity View

Each person's row shows:

| Element | Meaning |
|---------|---------|
| **Name + Avatar** | Team member |
| **Boulder %** | Ongoing commitment allocation (purple, if any) |
| **Undated** | Count of tasks with no due date |
| **This Week load %** | Weighted load from tasks due this week + boulders |
| **Next Week load %** | Weighted load from tasks due next week + boulders |
| **Task list** | Individual tasks with titles (clickable links) |

### Color Coding

| Color | Load Range | Meaning |
|-------|-----------|---------|
| Green | < 80% | Has capacity for more work |
| Amber | 80-100% | Near capacity |
| Red | > 100% | Overcommitted |

## Using Capacity for Planning

**Before assigning new work:** Check who has green capacity this week or next. Avoid assigning to people already in red.

**When someone is red:** Consider:
- Can any tasks be moved to next week?
- Are there blocked tasks that could be unblocked?
- Can work be redistributed to someone with green capacity?

**Boulders eat capacity:** A person with 40% boulder allocation only has 60% capacity for task work. Keep this in mind when assigning.

**Undated tasks are hidden load:** Tasks without due dates don't appear in the weekly calculation but still represent work. If someone has many undated tasks, their actual load is higher than shown.

## Configuration

Priority weights and status multipliers are configurable per team in the Admin panel under "System Settings". Adjusting these changes how load is calculated for everyone on the team.

For example, if your team's medium-priority work is actually close to high-priority in effort, increase the medium weight to better reflect reality.
