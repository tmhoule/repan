import { PrismaClient, UserRole, TaskStatus, TaskPriority, EffortEstimate, TeamRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const AVATAR_COLORS = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"];

const STARTER_BADGES = [
  { name: "First Blood", description: "Complete your first task", icon: "sword", criteriaType: "count_action", criteriaValue: { action: "complete_task", count: 1 } },
  { name: "Backlog Buster", description: "Pick up and complete 5 backlog items", icon: "broom", criteriaType: "count_action", criteriaValue: { action: "claim_backlog", count: 5 } },
  { name: "Unblocker", description: "Resolve 3 blockers", icon: "key", criteriaType: "count_action", criteriaValue: { action: "resolve_blocker", count: 3 } },
  { name: "Streak Master", description: "10-day daily check-in streak", icon: "fire", criteriaType: "streak_milestone", criteriaValue: { streak_type: "daily_checkin", count: 10 } },
  { name: "Deadline Crusher", description: "5 tasks completed on time in a row", icon: "clock", criteriaType: "count_action", criteriaValue: { action: "complete_on_time", count: 5 } },
  { name: "Centurion", description: "Reach 100 total points", icon: "shield", criteriaType: "total_points", criteriaValue: { count: 100 } },
  { name: "Commentator", description: "Leave 20 comments", icon: "speech-bubble", criteriaType: "count_action", criteriaValue: { action: "comment", count: 20 } },
  { name: "Heavy Lifter", description: "Complete 10 tasks in total", icon: "weight", criteriaType: "count_action", criteriaValue: { action: "complete_task", count: 10 } },
  { name: "Early Bird", description: "Complete 3 tasks on time", icon: "sunrise", criteriaType: "count_action", criteriaValue: { action: "complete_on_time", count: 3 } },
  { name: "Team Player", description: "Pick up 10 backlog items", icon: "handshake", criteriaType: "count_action", criteriaValue: { action: "claim_backlog", count: 10 } },
  { name: "Consistency King", description: "4-week momentum streak", icon: "crown", criteriaType: "streak_milestone", criteriaValue: { streak_type: "weekly_momentum", count: 4 } },
  { name: "Prolific", description: "Complete 25 total tasks", icon: "star", criteriaType: "count_action", criteriaValue: { action: "complete_task", count: 25 } },
  { name: "Detail Oriented", description: "Make 10 progress updates across all tasks", icon: "magnifying-glass", criteriaType: "count_action", criteriaValue: { action: "progress_update", count: 10 } },
  { name: "Rapid Fire", description: "Complete 3 tasks in one day", icon: "lightning", criteriaType: "single_day_count", criteriaValue: { action: "complete_task", count: 3 } },
  { name: "Marathon Runner", description: "30-day daily check-in streak", icon: "medal", criteriaType: "streak_milestone", criteriaValue: { streak_type: "daily_checkin", count: 30 } },
];

async function main() {
  // Create default team
  const team = await prisma.team.upsert({
    where: { name: "Default Team" },
    update: {},
    create: { name: "Default Team" },
  });

  // Create 6 users: 1 manager + 5 staff
  const users = [
    { name: "Todd",   role: UserRole.manager, avatarColor: AVATAR_COLORS[0], isSuperAdmin: true, teamRole: TeamRole.manager },
    { name: "Alice",  role: UserRole.staff,   avatarColor: AVATAR_COLORS[1], isSuperAdmin: false, teamRole: TeamRole.member },
    { name: "Bob",    role: UserRole.staff,   avatarColor: AVATAR_COLORS[2], isSuperAdmin: false, teamRole: TeamRole.member },
    { name: "Carol",  role: UserRole.staff,   avatarColor: AVATAR_COLORS[3], isSuperAdmin: false, teamRole: TeamRole.member },
    { name: "Dave",   role: UserRole.staff,   avatarColor: AVATAR_COLORS[4], isSuperAdmin: false, teamRole: TeamRole.member },
    { name: "Eve",    role: UserRole.staff,   avatarColor: AVATAR_COLORS[5], isSuperAdmin: false, teamRole: TeamRole.member },
  ];

  const createdUsers: Record<string, string> = {};
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { name: u.name },
      update: {},
      create: { name: u.name, role: u.role, avatarColor: u.avatarColor, isSuperAdmin: u.isSuperAdmin },
    });
    createdUsers[u.name] = user.id;

    // Add to team
    await prisma.teamMembership.upsert({
      where: { userId_teamId: { userId: user.id, teamId: team.id } },
      update: {},
      create: { userId: user.id, teamId: team.id, role: u.teamRole },
    });
  }

  const todd = createdUsers["Todd"];
  const alice = createdUsers["Alice"];
  const bob = createdUsers["Bob"];
  const carol = createdUsers["Carol"];
  const dave = createdUsers["Dave"];
  const eve = createdUsers["Eve"];

  // Create badges
  for (const badge of STARTER_BADGES) {
    await prisma.award.upsert({
      where: { name: badge.name },
      update: {},
      create: badge,
    });
  }

  // Create 20 tasks with realistic variety
  const tasks: Array<{
    title: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    effortEstimate: EffortEstimate;
    percentComplete: number;
    dueDate?: Date;
    assignedToId: string | null;
    blockerReason?: string;
    backlogPosition?: number;
  }> = [
    // Todd — 3 tasks
    { title: "Review Q2 staffing plan", description: "Evaluate headcount needs for next quarter", status: TaskStatus.in_progress, priority: TaskPriority.high, effortEstimate: EffortEstimate.large, percentComplete: 30, dueDate: new Date("2026-04-15"), assignedToId: todd },
    { title: "Prepare board presentation", description: "Monthly metrics and highlights deck", status: TaskStatus.in_progress, priority: TaskPriority.high, effortEstimate: EffortEstimate.large, percentComplete: 60, dueDate: new Date("2026-04-02"), assignedToId: todd },
    { title: "Sign off on marketing budget", status: TaskStatus.blocked, priority: TaskPriority.medium, effortEstimate: EffortEstimate.small, percentComplete: 0, dueDate: new Date("2026-04-08"), assignedToId: todd, blockerReason: "Waiting for finance to send revised numbers" },

    // Alice — 4 tasks
    { title: "Redesign landing page hero", description: "New branding guidelines from marketing", status: TaskStatus.in_progress, priority: TaskPriority.high, effortEstimate: EffortEstimate.large, percentComplete: 75, dueDate: new Date("2026-04-03"), assignedToId: alice },
    { title: "Fix mobile nav overflow bug", description: "Hamburger menu clips on small screens", status: TaskStatus.not_started, priority: TaskPriority.medium, effortEstimate: EffortEstimate.small, percentComplete: 0, dueDate: new Date("2026-04-06"), assignedToId: alice },
    { title: "Build settings page UI", status: TaskStatus.in_progress, priority: TaskPriority.medium, effortEstimate: EffortEstimate.medium, percentComplete: 40, dueDate: new Date("2026-04-12"), assignedToId: alice },
    { title: "Accessibility audit for forms", description: "WCAG 2.1 AA compliance check", status: TaskStatus.not_started, priority: TaskPriority.low, effortEstimate: EffortEstimate.medium, percentComplete: 0, dueDate: new Date("2026-04-20"), assignedToId: alice },

    // Bob — 3 tasks
    { title: "Write API docs for v2 endpoints", status: TaskStatus.in_progress, priority: TaskPriority.medium, effortEstimate: EffortEstimate.large, percentComplete: 40, dueDate: new Date("2026-04-12"), assignedToId: bob },
    { title: "Migrate auth to OAuth2", description: "Security audit flagged session tokens", status: TaskStatus.blocked, priority: TaskPriority.high, effortEstimate: EffortEstimate.large, percentComplete: 20, dueDate: new Date("2026-04-10"), assignedToId: bob, blockerReason: "Waiting on SSO provider credentials" },
    { title: "Set up CI/CD for staging", status: TaskStatus.not_started, priority: TaskPriority.high, effortEstimate: EffortEstimate.medium, percentComplete: 0, dueDate: new Date("2026-04-05"), assignedToId: bob },

    // Carol — 3 tasks
    { title: "Database index optimization", description: "Slow queries on reports endpoint", status: TaskStatus.in_progress, priority: TaskPriority.high, effortEstimate: EffortEstimate.medium, percentComplete: 15, dueDate: new Date("2026-04-04"), assignedToId: carol },
    { title: "Implement rate limiting", description: "Public API abuse prevention", status: TaskStatus.not_started, priority: TaskPriority.high, effortEstimate: EffortEstimate.medium, percentComplete: 0, dueDate: new Date("2026-04-09"), assignedToId: carol },
    { title: "Set up monitoring dashboards", description: "Grafana + alerting for staging", status: TaskStatus.in_progress, priority: TaskPriority.medium, effortEstimate: EffortEstimate.medium, percentComplete: 50, dueDate: new Date("2026-04-07"), assignedToId: carol },

    // Dave — 2 tasks
    { title: "Load test payment pipeline", description: "Target: 1000 TPS sustained", status: TaskStatus.in_progress, priority: TaskPriority.high, effortEstimate: EffortEstimate.large, percentComplete: 35, dueDate: new Date("2026-04-11"), assignedToId: dave },
    { title: "Update privacy policy", description: "Legal sent new GDPR language", status: TaskStatus.not_started, priority: TaskPriority.high, effortEstimate: EffortEstimate.small, percentComplete: 0, dueDate: new Date("2026-04-03"), assignedToId: dave },

    // Eve — 1 task
    { title: "Create onboarding email sequence", description: "5-part drip campaign for signups", status: TaskStatus.in_progress, priority: TaskPriority.medium, effortEstimate: EffortEstimate.medium, percentComplete: 80, dueDate: new Date("2026-04-01"), assignedToId: eve },

    // Backlog — 4 unassigned tasks
    { title: "Research competitor pricing", description: "PM wants comparison matrix", status: TaskStatus.not_started, priority: TaskPriority.medium, effortEstimate: EffortEstimate.medium, percentComplete: 0, assignedToId: null, backlogPosition: 1 },
    { title: "Add dark mode support", description: "Frequently requested feature", status: TaskStatus.not_started, priority: TaskPriority.low, effortEstimate: EffortEstimate.large, percentComplete: 0, assignedToId: null, backlogPosition: 2 },
    { title: "Automate monthly reporting", description: "Currently manual, takes 2 hours", status: TaskStatus.not_started, priority: TaskPriority.medium, effortEstimate: EffortEstimate.medium, percentComplete: 0, assignedToId: null, backlogPosition: 3 },
    { title: "Upgrade Node.js to v22 LTS", status: TaskStatus.not_started, priority: TaskPriority.low, effortEstimate: EffortEstimate.small, percentComplete: 0, assignedToId: null, backlogPosition: 4 },
  ];

  for (const t of tasks) {
    await prisma.task.create({
      data: {
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        effortEstimate: t.effortEstimate,
        percentComplete: t.percentComplete,
        dueDate: t.dueDate,
        assignedToId: t.assignedToId,
        blockerReason: t.blockerReason,
        backlogPosition: t.backlogPosition ?? null,
        createdById: todd,
        teamId: team.id,
      },
    });
  }

  console.log("Seed complete: 1 team, 6 users (1 manager + 5 staff), 15 badges, 20 tasks (16 assigned + 4 backlog)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
