import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { awardAction } from "@/lib/gamification";

export async function POST(request: NextRequest) {
  try {
  const user = await requireSession();
  const teamId = await requireTeam();
  const { taskId } = await request.json();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (task.teamId !== teamId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (task.assignedToId) return NextResponse.json({ error: "Already claimed" }, { status: 409 });

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: { assignedToId: user.id, backlogPosition: null },
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
