import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET() {
  const user = await requireSession();
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
  ]);
  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const user = await requireSession();
  const { notificationIds } = await request.json();
  await prisma.notification.updateMany({
    where: { id: { in: notificationIds }, userId: user.id },
    data: { isRead: true },
  });
  return NextResponse.json({ success: true });
}
