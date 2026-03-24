import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./db";

const SESSION_COOKIE = "repan_session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie?.value) return null;
  return prisma.user.findUnique({ where: { id: sessionCookie.value, isActive: true } });
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", maxAge: SESSION_MAX_AGE, path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireSession() {
  const user = await getSession();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireManager() {
  const user = await requireSession();
  if (user.role !== "manager") throw new Error("Forbidden");
  return user;
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof Error) {
    if (error.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "Forbidden")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
