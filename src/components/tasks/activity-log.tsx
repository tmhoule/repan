"use client";

import { useEffect } from "react";
import useSWRInfinite from "swr/infinite";
import { MessageSquare, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatDistanceToNow(date: Date): string {
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? "s" : ""} ago`;
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} year${diffYears !== 1 ? "s" : ""} ago`;
}

interface ActivityUser {
  id: string;
  name: string;
  avatarColor: string;
}

interface ActivityEntry {
  id: string;
  type: string;
  content: string | null;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
  user: ActivityUser;
}

interface ActivityPage {
  activities: ActivityEntry[];
  nextCursor: string | null;
}

interface ActivityLogProps {
  taskId: string;
}

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  blocked: "Blocked",
  stalled: "Stalled",
  done: "Done",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const EFFORT_LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

function formatValue(type: string, value: string | null): string {
  if (!value || value === "null") return "none";
  if (type === "status_change") return STATUS_LABELS[value] ?? value;
  if (type === "priority_change") return PRIORITY_LABELS[value] ?? value;
  if (type === "effort_change") return EFFORT_LABELS[value] ?? value;
  if (type === "progress_update") return `${value}%`;
  if (type === "due_date_change") {
    try {
      const [y, m, d] = value.split("T")[0].split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return value;
    }
  }
  return value;
}

function describeActivity(entry: ActivityEntry): string {
  const { type, oldValue, newValue } = entry;
  switch (type) {
    case "status_change":
      return `changed status from ${formatValue(type, oldValue)} to ${formatValue(type, newValue)}`;
    case "priority_change":
      return `changed priority from ${formatValue(type, oldValue)} to ${formatValue(type, newValue)}`;
    case "progress_update":
      return `updated progress to ${formatValue(type, newValue)}`;
    case "assignment_change":
      if (!newValue || newValue === "null") return "unassigned the task";
      return `reassigned the task`;
    case "due_date_change":
      if (!newValue || newValue === "null") return "removed the due date";
      return `set due date to ${formatValue(type, newValue)}`;
    case "effort_change":
      return `changed effort estimate from ${formatValue(type, oldValue)} to ${formatValue(type, newValue)}`;
    case "title_change":
      return `updated the title`;
    case "description_change":
      return `updated the description`;
    case "blocker_added":
      return `marked the task as blocked`;
    case "blocker_resolved":
      return `resolved the blocker`;
    case "comment":
      return "commented";
    default:
      return type.replace(/_/g, " ");
  }
}

function AvatarCircle({ user }: { user: ActivityUser }) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
      style={{ backgroundColor: user.avatarColor || "#6366f1" }}
      title={user.name}
    >
      {initials}
    </div>
  );
}

export function ActivityLog({ taskId, onMutateReady }: ActivityLogProps & { onMutateReady?: (mutate: () => void) => void }) {
  const getKey = (pageIndex: number, previousPage: ActivityPage | null) => {
    if (previousPage && !previousPage.nextCursor) return null;
    if (pageIndex === 0) return `/api/tasks/${taskId}/activity`;
    return `/api/tasks/${taskId}/activity?cursor=${previousPage!.nextCursor}`;
  };

  const { data, size, setSize, isLoading, mutate } = useSWRInfinite<ActivityPage>(getKey, {
    revalidateFirstPage: true,
  });

  useEffect(() => {
    onMutateReady?.(() => { mutate(); });
  }, [onMutateReady, mutate]);

  const pages = data ?? [];
  const allActivities = pages.flatMap((p) => p.activities);
  const lastPage = pages[pages.length - 1];
  const hasMore = lastPage?.nextCursor != null;
  const isLoadingMore = isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");

  if (isLoading && allActivities.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-7 h-7 rounded-full bg-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-48 bg-muted rounded animate-pulse" />
              <div className="h-3 w-24 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!isLoading && allActivities.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <Activity className="size-8 opacity-30" />
        <p className="text-sm">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="relative">
        {allActivities.map((entry, idx) => {
          const isComment = entry.type === "comment";
          const isLast = idx === allActivities.length - 1;

          return (
            <li key={entry.id} className="flex gap-3 group">
              {/* Timeline line */}
              <div className="flex flex-col items-center">
                <AvatarCircle user={entry.user} />
                {!isLast && (
                  <div className="w-px flex-1 bg-border mt-1 mb-1 min-h-[1rem]" />
                )}
              </div>

              {/* Content */}
              <div className={cn("pb-4 flex-1 min-w-0", isLast && "pb-0")}>
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-sm font-medium">{entry.user.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {describeActivity(entry)}
                  </span>
                  <span className="text-xs text-muted-foreground/70 ml-auto shrink-0 whitespace-nowrap">
                    {formatDistanceToNow(new Date(entry.timestamp))}
                  </span>
                </div>

                {/* Comment body */}
                {isComment && entry.content && (
                  <div className="mt-2 rounded-lg border bg-muted/40 px-3 py-2 text-sm text-foreground flex items-start gap-2">
                    <MessageSquare className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                    <p className="whitespace-pre-wrap break-words">{entry.content}</p>
                  </div>
                )}

                {/* Blocker content */}
                {entry.type === "blocker_added" && entry.content && (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                    {entry.content}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSize(size + 1)}
            disabled={!!isLoadingMore}
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
