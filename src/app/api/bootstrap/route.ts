import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET: Check if setup is needed (no super admin exists)
export async function GET() {
  const superAdmin = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  return NextResponse.json({ needsSetup: !superAdmin });
}

// POST: Create the first super admin + default team (only works if no super admin exists)
export async function POST(request: NextRequest) {
  // Check no super admin exists
  const existing = await prisma.user.findFirst({ where: { isSuperAdmin: true } });
  if (existing) {
    return NextResponse.json({ error: "Super admin already exists" }, { status: 409 });
  }

  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Create user as super admin
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      role: "manager",
      isSuperAdmin: true,
      avatarColor: "#8B5CF6",
    },
  });

  // Create a default team and add the user as manager
  const team = await prisma.team.create({
    data: { name: "Default Team" },
  });

  await prisma.teamMembership.create({
    data: { userId: user.id, teamId: team.id, role: "manager" },
  });

  // Seed the starter badges if none exist
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
    for (const badge of badges) {
      await prisma.award.create({ data: badge });
    }
  }

  return NextResponse.json({ user, team }, { status: 201 });
}
