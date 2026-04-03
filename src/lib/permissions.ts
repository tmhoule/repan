type UserContext = { id: string; role: "manager" | "staff"; teamRole?: "manager" | "member" };
type TaskContext = { createdById: string | null; assignedToId: string | null };

export function canEditTask(user: UserContext, task: TaskContext): boolean {
  if (user.teamRole === "manager" || user.role === "manager") return true;
  return task.createdById === user.id || task.assignedToId === user.id;
}
export function canDeleteTask(user: UserContext): boolean {
  return user.teamRole === "manager" || user.role === "manager";
}
export function canAccessAdmin(user: UserContext): boolean {
  return user.teamRole === "manager" || user.role === "manager";
}
export function canReorderBacklog(user: UserContext): boolean {
  return user.teamRole === "manager" || user.role === "manager";
}
export function canViewFullReports(user: UserContext): boolean {
  return user.teamRole === "manager" || user.role === "manager";
}
