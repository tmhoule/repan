import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { canEditTask, canDeleteTask } from "@/lib/permissions";
import { createNotification } from "@/lib/notifications";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, avatarColor: true } },
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  const body = await request.json();

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canEditTask({ id: user.id, role: user.role }, { createdById: task.createdById, assignedToId: task.assignedToId })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const activities: any[] = [];
  const track = (type: string, oldVal: any, newVal: any) => {
    if (newVal !== undefined && String(oldVal) !== String(newVal)) {
      activities.push({ taskId: id, userId: user.id, type, oldValue: String(oldVal), newValue: String(newVal) });
    }
  };

  track("status_change", task.status, body.status);
  track("priority_change", task.priority, body.priority);
  track("progress_update", task.percentComplete, body.percentComplete);
  track("assignment_change", task.assignedToId, body.assignedToId);
  track("due_date_change", task.dueDate?.toISOString(), body.dueDate);
  track("effort_change", task.effortEstimate, body.effortEstimate);
  track("title_change", task.title, body.title);
  track("description_change", task.description, body.description);

  if (body.status === "blocked" && task.status !== "blocked") {
    activities.push({ taskId: id, userId: user.id, type: "blocker_added", content: body.blockerReason });
  }
  if (task.status === "blocked" && body.status && body.status !== "blocked") {
    activities.push({ taskId: id, userId: user.id, type: "blocker_resolved" });
    if (task.assignedToId && task.assignedToId !== user.id) {
      await createNotification(task.assignedToId, "blocker_resolved", "Blocker resolved", `"${task.title}" is no longer blocked`, task.id);
    }
  }

  const updateData: any = {};
  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) updateData.status = body.status;
  if (body.priority !== undefined) updateData.priority = body.priority;
  if (body.percentComplete !== undefined) updateData.percentComplete = body.percentComplete;
  if (body.effortEstimate !== undefined) updateData.effortEstimate = body.effortEstimate;
  if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  if (body.blockerReason !== undefined) updateData.blockerReason = body.blockerReason;
  if (body.assignedToId !== undefined) {
    updateData.assignedToId = body.assignedToId;
    updateData.backlogPosition = body.assignedToId ? null : task.backlogPosition;
  }
  if (body.status === "done") {
    updateData.completedAt = new Date();
    updateData.percentComplete = 100;
  }

  const [updatedTask] = await Promise.all([
    prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, avatarColor: true } },
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
      },
    }),
    activities.length > 0 ? prisma.taskActivity.createMany({ data: activities }) : Promise.resolve(),
  ]);

  return NextResponse.json(updatedTask);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireSession();
  const { id } = await params;
  if (!canDeleteTask({ id: user.id, role: user.role })) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
