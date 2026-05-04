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

const PRIORITY_RANK: Record<"high" | "medium" | "low", number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function dueDateMs(d: Date | string | null): number | null {
  if (d === null) return null;
  return d instanceof Date ? d.getTime() : new Date(d).getTime();
}

export function sortTasks<T extends SortableTask>(tasks: T[], sort: SortKey, dir: SortDir): T[] {
  const out = [...tasks];
  const flip = dir === "desc" ? -1 : 1;

  out.sort((a, b) => {
    switch (sort) {
      case "title":
        return a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) * flip;

      case "priority":
        return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) * flip;

      case "dueDate": {
        const aMs = dueDateMs(a.dueDate);
        const bMs = dueDateMs(b.dueDate);
        if (aMs === null && bMs === null) return 0;
        if (aMs === null) return dir === "asc" ? 1 : -1;
        if (bMs === null) return dir === "asc" ? -1 : 1;
        return (aMs - bMs) * flip;
      }

      case "owner": {
        const aName = a.assignedTo?.name ?? null;
        const bName = b.assignedTo?.name ?? null;
        if (aName === null && bName === null) return 0;
        if (aName === null) return 1;
        if (bName === null) return -1;
        return aName.localeCompare(bName, undefined, { sensitivity: "base" }) * flip;
      }
    }
  });

  return out;
}
