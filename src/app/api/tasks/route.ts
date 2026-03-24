import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { sortByUrgency } from "@/lib/urgency";
import { createNotification } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  const user = await requireSession();
  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.getAll("status");
  const priority = searchParams.get("priority");
  const search = searchParams.get("search");
  const assignedTo = searchParams.get("assignedTo") || user.id;

  const where: any = { archivedAt: null, assignedToId: assignedTo };
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
    },
  });

  const sortedTasks = sortByUrgency(
    tasks.map((t) => ({ ...t, priority: t.priority as "high" | "medium" | "low", dueDate: t.dueDate, createdAt: t.createdAt }))
  );

  return NextResponse.json({ tasks: sortedTasks });
}

export async function POST(request: NextRequest) {
  const user = await requireSession();
  const body = await request.json();

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
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      createdById: user.id,
      assignedToId,
      backlogPosition: assignedToId ? null : body.backlogPosition,
    },
    include: {
      createdBy: { select: { id: true, name: true, avatarColor: true } },
      assignedTo: { select: { id: true, name: true, avatarColor: true } },
    },
  });

  if (task.assignedToId && task.assignedToId !== user.id) {
    await createNotification(task.assignedToId, "task_assigned", "New task assigned", `"${task.title}" was assigned to you by ${user.name}`, task.id);
  }

  return NextResponse.json(task, { status: 201 });
}
