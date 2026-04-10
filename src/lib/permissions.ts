type UserContext = { id: string; role: "manager" | "staff"; teamRole?: "manager" | "member" | "supervisor" };
type TaskContext = { createdById: string | null; assignedToId: string | null };

export function canEditTask(user: UserContext, task: TaskContext): boolean {
  if (user.teamRole === "manager" || user.role === "manager") return true;
  if (task.createdById === user.id || task.assignedToId === user.id) return true;
  // Any team member can edit team tasks; changes are tracked in TaskActivity.
  // Supervisors remain read-only.
  return user.teamRole === "member";
}
export function canDeleteTask(user: UserContext, task?: TaskContext): boolean {
  if (user.teamRole === "manager" || user.role === "manager") return true;
  if (task) return task.createdById === user.id || task.assignedToId === user.id;
  return false;
}
export function canAccessAdmin(user: UserContext): boolean {
  return user.teamRole === "manager" || user.role === "manager";
}
export function canReorderBacklog(user: UserContext): boolean {
  return user.teamRole === "manager" || user.role === "manager";
}
export function canViewFullReports(user: UserContext): boolean {
  return user.teamRole === "manager" || user.teamRole === "supervisor" || user.role === "manager";
}
