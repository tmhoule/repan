import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireManager } from "@/lib/session";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true, avatarColor: true },
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
