import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// GET: Check if setup is needed AND return public team/user list for login
export async function GET() {
  let superAdmin;
  try {
    superAdmin = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  } catch {
    // DB not ready — treat as needs setup
    return NextResponse.json({ needsSetup: true, teams: [] });
  }

  if (!superAdmin) {
    return NextResponse.json({ needsSetup: true, teams: [] });
  }

  // Return teams with their members for the login page
  const teams = await prisma.team.findMany({
    include: {
      memberships: {
        where: { user: { isActive: true } },
        include: { user: { select: { id: true, name: true, avatarColor: true, passwordHash: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  // Check if SSO is enabled
  let ssoEnabled = false;
  try {
    const samlConfig = await prisma.samlConfig.findUnique({ where: { id: "singleton" } });
    ssoEnabled = samlConfig?.enabled ?? false;
  } catch {
    // Table may not exist yet during migration
  }

  return NextResponse.json({
    needsSetup: false,
    ssoEnabled,
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      members: t.memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatarColor: m.user.avatarColor,
        hasPassword: !!m.user.passwordHash,
      })),
    })),
  });
}

// POST: Create the first super admin + default team (only works if no super admin exists)
export async function POST(request: NextRequest) {
  const existing = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  if (existing) {
    return NextResponse.json({ error: "Super admin already exists" }, { status: 409 });
  }

  const { name, password } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name: name.trim(), role: "manager", isSuperAdmin: true, avatarColor: "#8B5CF6", passwordHash },
  });

  // Find or create default team
  let team = await prisma.team.findFirst({ where: { name: "Default Team" } });
  if (!team) {
    team = await prisma.team.create({ data: { name: "Default Team" } });
  }

  await prisma.teamMembership.create({
    data: { userId: user.id, teamId: team.id, role: "manager" },
  });

  const badgeCount = await prisma.award.count();
  if (badgeCount === 0) {
    const badges = [
      { name: "First Blood", description: "Complete your first task", icon: "sword", criteriaType: "count_action", criteriaValue: { action: "complete_task", count: 1 } },
      { name: "Backlog Buster", description: "Pick up and complete 5 backlog items", icon: "broom", criteriaType: "count_action", criteriaValue: { action: "claim_backlog", count: 5 } },
      { name: "Unblocker", description: "Resolve 3 blockers", icon: "key", criteriaType: "count_action", criteriaValue: { action: "resolve_blocker", count: 3 } },
      { name: "Streak Master", description: "10-day daily check-in streak", icon: "fire", criteriaType: "streak_milestone", criteriaValue: { streak_type: "daily_checkin", count: 10 } },
      { name: "Deadline Crusher", description: "5 tasks completed on time in a row", icon: "clock", criteriaType: "consecutive_action", criteriaValue: { action: "complete_on_time", count: 5 } },
      { name: "Centurion", description: "Reach 100 total points", icon: "shield", criteriaType: "total_points", criteriaValue: { count: 100 } },
      { name: "Commentator", description: "Leave 20 comments", icon: "speech-bubble", criteriaType: "count_action", criteriaValue: { action: "comment", count: 20 } },
      { name: "Heavy Lifter", description: "Complete 3 Large-effort tasks", icon: "weight", criteriaType: "count_action", criteriaValue: { action: "complete_task", count: 3 } },
      { name: "Early Bird", description: "Complete 3 tasks before their due date", icon: "sunrise", criteriaType: "count_action", criteriaValue: { action: "complete_on_time", count: 3 } },
      { name: "Team Player", description: "Pick up 10 backlog items", icon: "handshake", criteriaType: "count_action", criteriaValue: { action: "claim_backlog", count: 10 } },
      { name: "Consistency King", description: "4-week momentum streak", icon: "crown", criteriaType: "streak_milestone", criteriaValue: { streak_type: "weekly_momentum", count: 4 } },
      { name: "Prolific", description: "Complete 25 total tasks", icon: "star", criteriaType: "count_action", criteriaValue: { action: "complete_task", count: 25 } },
      { name: "Detail Oriented", description: "Update progress on a task 10+ times", icon: "magnifying-glass", criteriaType: "count_action", criteriaValue: { action: "progress_update", count: 10 } },
      { name: "Rapid Fire", description: "Complete 3 tasks in one day", icon: "lightning", criteriaType: "single_day_count", criteriaValue: { action: "complete_task", count: 3 } },
      { name: "Marathon Runner", description: "30-day daily check-in streak", icon: "medal", criteriaType: "streak_milestone", criteriaValue: { streak_type: "daily_checkin", count: 30 } },
    ];
    for (const badge of badges) { await prisma.award.create({ data: badge }); }
  }

  return NextResponse.json({ user, team }, { status: 201 });
}
