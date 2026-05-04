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

export function parseParams(searchParams: URLSearchParams): ParsedParams {
  const requestedStatuses = searchParams.getAll("status")
    .filter((s): s is ActiveTaskStatus => (ACTIVE_STATUSES as readonly string[]).includes(s));
  const status = { in: requestedStatuses.length > 0 ? requestedStatuses : [...ACTIVE_STATUSES] };

  const where: AllTasksWhere = { status };

  const assignedTo = searchParams.get("assignedTo");
  if (assignedTo === "unassigned") where.assignedToId = null;
  else if (assignedTo) where.assignedToId = assignedTo;

  const bucketId = searchParams.get("bucketId");
  if (bucketId === "uncategorized") where.bucketId = null;
  else if (bucketId) where.bucketId = bucketId;

  const rawSort = searchParams.get("sort");
  const sort: SortKey = (SORT_KEYS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as SortKey) : "dueDate";

  const rawDir = searchParams.get("dir");
  const dir: SortDir = (SORT_DIRS as readonly string[]).includes(rawDir ?? "")
    ? (rawDir as SortDir) : "asc";

  return { where, sort, dir };
}

export function sortTasks<T extends SortableTask>(_tasks: T[], _sort: SortKey, _dir: SortDir): T[] {
  throw new Error("not implemented");
}
