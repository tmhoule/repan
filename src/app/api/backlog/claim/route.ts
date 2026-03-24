import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const user = await requireSession();
  const { taskId } = await request.json();

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
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

  return NextResponse.json(updatedTask);
}
