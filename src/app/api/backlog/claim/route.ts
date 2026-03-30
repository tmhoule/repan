import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { awardAction } from "@/lib/gamification";

export async function POST(request: NextRequest) {
  try {
  const user = await requireSession();
  const teamId = await requireTeam();
  const { taskId } = await request.json();

  // Atomic claim: only succeeds if task is still unassigned and belongs to this team
  const result = await prisma.task.updateMany({
    where: { id: taskId, assignedToId: null, teamId },
    data: { assignedToId: user.id, backlogPosition: null },
  });

  if (result.count === 0) {
    // Check why it failed: not found, wrong team, or already claimed
    const task = await prisma.task.findUnique({ where: { id: taskId }, select: { teamId: true, assignedToId: true } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (task.teamId !== teamId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json({ error: "Already claimed" }, { status: 409 });
  }

  const updatedTask = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      createdBy: { select: { id: true, name: true, avatarColor: true } },
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  await prisma.taskActivity.create({
    data: { taskId, userId: user.id, type: "assignment_change", oldValue: null, newValue: user.id, content: `${user.name} claimed this task from the backlog` },
  });

  try {
    await awardAction(user.id, { action: "claim_backlog" }, taskId);
  } catch (_) {
    // Gamification errors must not break the main operation
  }

  return NextResponse.json(updatedTask);
  } catch (error) {
    return handleApiError(error);
  }
}
