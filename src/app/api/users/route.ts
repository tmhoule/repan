import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager, requireSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const session = await requireSession();
  const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";

  // Only managers can see inactive users
  const where = (includeInactive && session.role === "manager")
    ? {}
    : { isActive: true };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, role: true, avatarColor: true, isActive: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(request: NextRequest) {
  await requireManager();
  const { name, role, avatarColor } = await request.json();
  const user = await prisma.user.create({
    data: { name, role: role || "staff", avatarColor },
  });
  return NextResponse.json(user, { status: 201 });
}
