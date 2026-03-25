import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { createNotification } from "@/lib/notifications";
import { awardAction } from "@/lib/gamification";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const user = await requireSession();
  const teamId = await requireTeam();
  const { id } = await params;
  const { content } = await request.json();

  if (!content?.trim()) return NextResponse.json({ error: "Comment content cannot be empty" }, { status: 400 });

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (task.teamId !== teamId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const activity = await prisma.taskActivity.create({
    data: { taskId: id, userId: user.id, type: "comment", content },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
  });

  if (task.assignedToId && task.assignedToId !== user.id) {
    await createNotification(task.assignedToId, "comment_added", "New comment", `${user.name} commented on "${task.title}"`, task.id);
  }

  try {
    await awardAction(user.id, { action: "comment" }, id);
  } catch (_) {
    // Gamification errors must not break the main operation
  }

  return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
