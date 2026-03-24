import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { setSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await setSession(user.id);
  return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role, avatarColor: user.avatarColor } });
}
