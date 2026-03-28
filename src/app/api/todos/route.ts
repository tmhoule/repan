import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession, handleApiError, requireTeam } from "@/lib/session";

export async function GET() {
  try {
    const user = await requireSession();
    const teamId = await requireTeam();
    const todos = await prisma.todo.findMany({
      where: { userId: user.id, teamId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, description: true, createdAt: true },
    });
    return NextResponse.json({ todos });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    const teamId = await requireTeam();
    const body = await request.json();
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const todo = await prisma.todo.create({
      data: {
        title,
        description: body.description?.trim() || null,
        userId: user.id,
        teamId,
      },
      select: { id: true, title: true, description: true, createdAt: true },
    });
    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
