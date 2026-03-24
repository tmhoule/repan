import { cookies } from "next/headers";
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
