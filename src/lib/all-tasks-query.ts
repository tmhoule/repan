export type ActiveTaskStatus =
  | "not_started"
  | "in_progress"
  | "blocked"
  | "stalled"
  | "paused";

export const ACTIVE_STATUSES: readonly ActiveTaskStatus[] = [
  "not_started",
  "in_progress",
  "blocked",
  "stalled",
  "paused",
] as const;

export type SortKey = "dueDate" | "priority" | "owner" | "title";
export type SortDir = "asc" | "desc";

export const SORT_KEYS: readonly SortKey[] = ["dueDate", "priority", "owner", "title"] as const;
export const SORT_DIRS: readonly SortDir[] = ["asc", "desc"] as const;

export type AllTasksWhere = {
  status: { in: ActiveTaskStatus[] };
  assignedToId?: string | null;
  bucketId?: string | null;
};

export type ParsedParams = {
  where: AllTasksWhere;
  sort: SortKey;
  dir: SortDir;
};

export type SortableTask = {
  title: string;
  priority: "high" | "medium" | "low";
  dueDate: Date | string | null;
  assignedTo: { name: string } | null;
};

export function parseParams(_searchParams: URLSearchParams): ParsedParams {
  throw new Error("not implemented");
}

export function sortTasks<T extends SortableTask>(_tasks: T[], _sort: SortKey, _dir: SortDir): T[] {
  throw new Error("not implemented");
}
