import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";
import { sortByUrgency } from "@/lib/urgency";
import { validateTaskFields, clampTaskFields } from "@/lib/task-validation";
import { createNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const teamId = await requireTeam();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.getAll("status");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const requestedAssignedTo = searchParams.get("assignedTo");

    // Allow any team member to view tasks assigned to other team members (read-only view)
    let assignedTo = user.id;
    if (requestedAssignedTo && requestedAssignedTo !== user.id) {
      const targetMembership = await prisma.teamMembership.findUnique({
        where: { userId_teamId: { userId: requestedAssignedTo, teamId } },
      });
      if (targetMembership) {
        assignedTo = requestedAssignedTo;
      }
    } else if (requestedAssignedTo) {
      assignedTo = requestedAssignedTo;
    }

    const where: any = { archivedAt: null, assignedToId: assignedTo, teamId };
    if (status.length > 0) where.status = { in: status };
    if (priority) where.priority = priority;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, avatarColor: true } },
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
        bucket: { select: { id: true, name: true, colorKey: true } },
      },
    });

    const sortedTasks = sortByUrgency(
      tasks.map((t) => ({ ...t, priority: t.priority as "high" | "medium" | "low", dueDate: t.dueDate, createdAt: t.createdAt }))
    );

    return NextResponse.json({ tasks: sortedTasks });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const teamId = await requireTeam();
    const body = await request.json();

    const validationError = validateTaskFields(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    clampTaskFields(body);

    let assignedToId = body.assignedToId !== undefined ? body.assignedToId : null;
    if (user.role === "staff") {
      if (assignedToId && assignedToId !== user.id) {
        return NextResponse.json({ error: "Staff can only assign tasks to themselves" }, { status: 403 });
      }
      if (assignedToId === undefined) assignedToId = user.id;
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        priority: body.priority || "medium",
        effortEstimate: body.effortEstimate || "medium",
        dueDate: body.dueDate && body.dueDate !== "" ? new Date(body.dueDate) : null,
        status: body.status || "not_started",
        timeAllocation: body.timeAllocation ?? 0,
        createdById: user.id,
        assignedToId,
        backlogPosition: assignedToId ? null : body.backlogPosition,
        teamId,
        bucketId: body.bucketId || null,
      },
      include: {
        createdBy: { select: { id: true, name: true, avatarColor: true } },
        assignedTo: { select: { id: true, name: true, avatarColor: true } },
        bucket: { select: { id: true, name: true, colorKey: true } },
      },
    });

    if (task.assignedToId && task.assignedToId !== user.id) {
      await createNotification(task.assignedToId, "task_assigned", "New task assigned", `"${task.title}" was assigned to you by ${user.name}`, task.id);
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
