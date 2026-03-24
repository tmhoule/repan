import { PrismaClient, UserRole, TaskStatus, TaskPriority, EffortEstimate } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

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
