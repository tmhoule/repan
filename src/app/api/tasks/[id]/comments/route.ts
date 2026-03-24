import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { createNotification } from "@/lib/notifications";
import { awardAction } from "@/lib/gamification";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const { content } = await request.json();

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

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
}
