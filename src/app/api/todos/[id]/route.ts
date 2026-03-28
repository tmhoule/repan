import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError } from "@/lib/session";
import { awardAction } from "@/lib/gamification";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const todo = await prisma.todo.findUnique({ where: { id } });
    if (!todo || todo.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(todo);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const todo = await prisma.todo.findUnique({ where: { id } });
    if (!todo || todo.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const data: any = {};
    if (body.title !== undefined) {
      const title = body.title.trim();
      if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
      data.title = title;
    }
    if (body.description !== undefined) {
      data.description = body.description?.trim() || null;
    }
    const updated = await prisma.todo.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireSession();
    const { id } = await params;
    const todo = await prisma.todo.findUnique({ where: { id } });
    if (!todo || todo.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.todo.delete({ where: { id } });
    try { await awardAction(user.id, { action: "complete_todo" }); } catch {}
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
