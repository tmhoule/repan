import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./db";

const SESSION_COOKIE = "repan_session";
const TEAM_COOKIE = "repan_team";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export async function getSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE);
  if (!sessionCookie?.value) return null;
  return prisma.user.findUnique({ where: { id: sessionCookie.value, isActive: true } });
}

export async function setSession(userId: string) {
  const isSecure = process.env.NODE_ENV === "production" && !process.env.DISABLE_SECURE_COOKIES;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true, secure: isSecure,
    sameSite: "lax", maxAge: SESSION_MAX_AGE, path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(TEAM_COOKIE);
}

export async function requireSession() {
  const user = await getSession();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireManager() {
  const user = await requireSession();
  // Super admins always have manager access
  if (user.isSuperAdmin) return user;
  // Check team membership role
  const teamId = await getActiveTeam();
  if (teamId) {
    const membership = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: user.id, teamId } },
    });
    if (membership?.role === "manager") return user;
  }
  throw new Error("Forbidden");
}

export async function getActiveTeam(): Promise<string | null> {
  const cookieStore = await cookies();
  const teamCookie = cookieStore.get(TEAM_COOKIE);
  return teamCookie?.value ?? null;
}

export async function setActiveTeam(teamId: string) {
  const cookieStore = await cookies();
  cookieStore.set(TEAM_COOKIE, teamId, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", maxAge: SESSION_MAX_AGE, path: "/",
  });
}

export async function requireTeam(): Promise<string> {
  const teamId = await getActiveTeam();
  if (!teamId) throw new Error("NoTeam");
  return teamId;
}

export function handleApiError(error: unknown): NextResponse {
  if (error instanceof Error) {
    if (error.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (error.message === "Forbidden")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (error.message === "NoTeam")
      return NextResponse.json({ error: "No active team" }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
