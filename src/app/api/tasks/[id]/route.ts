import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { canEditTask, canDeleteTask } from "@/lib/permissions";
import { getTeamRole } from "@/lib/team-auth";
import { validateTaskFields, clampTaskFields } from "@/lib/task-validation";
import { createNotification } from "@/lib/notifications";
import { awardAction, updateOnTimeStreak } from "@/lib/gamification";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSession();
    const teamId = await requireTeam();
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, avatarColor: true } },
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
        bucket: { select: { id: true, name: true, colorKey: true } },
      },
    });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (task.teamId !== teamId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.json(task);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const teamId = await requireTeam();
    const { id } = await params;
    const body = await request.json();

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (task.teamId !== teamId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const teamRole = await getTeamRole(user.id, teamId) ?? undefined;
    if (!canEditTask({ id: user.id, role: user.role, teamRole }, { createdById: task.createdById, assignedToId: task.assignedToId })) {
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

    const validationError = validateTaskFields(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    clampTaskFields(body);

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
    if (body.timeAllocation !== undefined) updateData.timeAllocation = body.timeAllocation;
    if (body.bucketId !== undefined) updateData.bucketId = body.bucketId || null;
    if (body.status === "done" && task.status !== "done") {
      updateData.completedAt = new Date();
      updateData.percentComplete = 100;
    } else if (body.status && body.status !== "done" && task.status === "done") {
      updateData.completedAt = null;
    }
    // Set startedAt when task first moves to in_progress
    if (body.status === "in_progress" && task.status !== "in_progress" && !task.startedAt) {
      updateData.startedAt = new Date();
    }
    // Clear startedAt if moved back to not_started
    if (body.status === "not_started") {
      updateData.startedAt = null;
    }

    const [updatedTask] = await Promise.all([
      prisma.task.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: { select: { id: true, name: true, avatarColor: true } },
          assignedTo: { select: { id: true, name: true, avatarColor: true } },
          bucket: { select: { id: true, name: true, colorKey: true } },
        },
      }),
      activities.length > 0 ? prisma.taskActivity.createMany({ data: activities }) : Promise.resolve(),
    ]);

    try {
      // When status changes to "done"
      if (body.status === "done" && task.status !== "done") {
        await awardAction(user.id, { action: "complete_task", effortEstimate: updatedTask.effortEstimate as any }, id);
        // On-time check
        if (updatedTask.dueDate) {
          const completedOnTime = new Date() <= updatedTask.dueDate;
          if (completedOnTime) await awardAction(user.id, { action: "complete_on_time" }, id);
          await updateOnTimeStreak(user.id, completedOnTime);
        }
      }

      // When percentComplete changes
      if (body.percentComplete !== undefined && body.percentComplete !== task.percentComplete) {
        await awardAction(user.id, { action: "progress_update" }, id);
      }

      // When blocker resolved
      if (task.status === "blocked" && body.status && body.status !== "blocked") {
        await awardAction(user.id, { action: "resolve_blocker" }, id);
      }
    } catch (_) {
      // Gamification errors must not break the main operation
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireSession();
    const teamId = await requireTeam();
    const { id } = await params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (task.teamId !== teamId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const deleteTeamRole = await getTeamRole(user.id, teamId) ?? undefined;
    if (!canDeleteTask({ id: user.id, role: user.role, teamRole: deleteTeamRole })) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    // Soft delete: archive the task instead of hard-deleting to preserve related records
    await prisma.task.update({ where: { id }, data: { archivedAt: new Date(), status: "done" } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
