import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireSession();
  const { id } = await params;
  const cursor = request.nextUrl.searchParams.get("cursor");
  const limit = 20;

  const activities = await prisma.taskActivity.findMany({
    where: { taskId: id },
    include: { user: { select: { id: true, name: true, avatarColor: true } } },
    orderBy: { timestamp: "desc" },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = activities.length > limit;
  const items = hasMore ? activities.slice(0, limit) : activities;
  return NextResponse.json({ activities: items, nextCursor: hasMore ? items[items.length - 1].id : null });
}
