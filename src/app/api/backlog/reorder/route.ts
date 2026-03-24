import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/session";

export async function PUT(request: NextRequest) {
  await requireManager();
  const { taskIds } = await request.json();
  await prisma.$transaction(
    taskIds.map((id: string, index: number) =>
      prisma.task.update({ where: { id }, data: { backlogPosition: index + 1 } })
    )
  );
  return NextResponse.json({ success: true });
}
