import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SESSION_COOKIE = "repan_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export async function POST(request: NextRequest) {
  const { userId } = await request.json();
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, avatarColor: user.avatarColor },
  });

  response.cookies.set(SESSION_COOKIE, user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return response;
}
