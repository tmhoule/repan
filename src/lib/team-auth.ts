import { prisma } from "./db";

export async function getTeamRole(userId: string, teamId: string): Promise<"manager" | "member" | null> {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  return membership?.role ?? null;
}

export async function requireTeamManager(userId: string, teamId: string): Promise<void> {
  const role = await getTeamRole(userId, teamId);
  if (role !== "manager") throw new Error("Forbidden");
}
