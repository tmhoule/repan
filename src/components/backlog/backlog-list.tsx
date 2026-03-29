"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { ForecastBadge } from "@/components/backlog/forecast-badge";
import { useUser } from "@/components/user-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BUCKET_COLORS, type BucketColorKey } from "@/lib/bucket-colors";

type TaskPriority = "high" | "medium" | "low";
type EffortEstimate = "small" | "medium" | "large";

interface ForecastResult {
  id: string;
  effortAhead: number;
  weeksToStart: number | null;
}

interface BacklogTask {
  id: string;
  title: string;
  priority: TaskPriority;
  effortEstimate: EffortEstimate;
  backlogPosition: number | null;
  dueDate?: string | null;
  createdBy: { id: string; name: string; avatarColor: string };
  forecast?: ForecastResult;
  bucket: { id: string; name: string; colorKey: string } | null;
  triaged?: boolean;
}

interface BacklogListProps {
  tasks: BacklogTask[];
  onMutate: () => void;
  groupByBucket?: boolean;
}

const effortConfig: Record<EffortEstimate, { label: string; className: string }> = {
  small: {
    label: "Low Effort",
    className:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800",
  },
  medium: {
    label: "Medium Effort",
    className:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800",
  },
  large: {
    label: "High Effort",
    className:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
  },
};

function TaskRow({
  task,
  index,
  isClaiming,
  isClaimed,
  onClaim,
  showClaim,
}: {
  task: BacklogTask;
  index: number;
  isClaiming: boolean;
  isClaimed: boolean;
  onClaim: (taskId: string) => void;
  showClaim: boolean;
}) {
  const effort = effortConfig[task.effortEstimate] ?? effortConfig.medium;

  return (
    <div
      key={task.id}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all duration-200",
        "hover:shadow-sm hover:border-border/80"
      )}
      style={
        isClaimed
          ? {
              transform: "translateY(-80px) scale(0.95)",
              opacity: 0,
              transition: "all 500ms cubic-bezier(0.4, 0, 0.2, 1)",
              background: "rgba(139, 92, 246, 0.15)",
              borderColor: "rgba(139, 92, 246, 0.4)",
            }
          : undefined
      }
    >
      {/* Rank */}
      <span className="flex-none w-6 text-center text-xs font-medium tabular-nums text-muted-foreground/60">
        {index + 1}
      </span>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {!task.triaged && (
            <span
              className="size-2 rounded-full bg-amber-400 shrink-0"
              title="Needs triage"
            />
          )}
          <Link
            href={`/tasks/${task.id}`}
            className="text-sm font-medium leading-snug line-clamp-2 hover:text-primary hover:underline transition-colors"
          >
            {task.title}
          </Link>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          by {task.createdBy.name}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        <PriorityBadge priority={task.priority} />
        <Badge
          variant="outline"
          className={cn("text-xs font-semibold border", effort.className)}
          title={`Effort: ${task.effortEstimate}`}
        >
          {effort.label}
        </Badge>
        {task.forecast && (
          <ForecastBadge weeksToStart={task.forecast.weeksToStart} />
        )}
      </div>

      {/* Claim button */}
      {showClaim && (
        <Button
          size="sm"
          variant="default"
          className="h-8 gap-1.5 text-xs ml-2 shrink-0"
          onClick={() => onClaim(task.id)}
          disabled={isClaiming}
        >
          {isClaiming ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle className="size-3.5" />
          )}
          Claim
        </Button>
      )}
    </div>
  );
}

export function BacklogList({ tasks, onMutate, groupByBucket }: BacklogListProps) {
  const { user } = useUser();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedId, setClaimedId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState(tasks);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  // Keep in sync with props
  useEffect(() => {
    if (!claimedId) {
      setLocalTasks(tasks);
    }
  }, [tasks, claimedId]);

  const handleClaim = useCallback(
    async (taskId: string) => {
      setClaimingId(taskId);
      try {
        const res = await fetch("/api/backlog/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to claim task");
        }
        setClaimedId(taskId);
        setTimeout(() => {
          setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
          setClaimedId(null);
          setClaimingId(null);
          toast.success("Task claimed! It's now in your task list above.");
          onMutate();
        }, 500);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to claim task");
        setClaimingId(null);
      }
    },
    [onMutate]
  );

  if (localTasks.length === 0) return null;

  const showClaim = !!user;

  if (groupByBucket) {
    // Group tasks: uncategorized first, then by bucket
    const uncategorized = localTasks.filter((t) => !t.bucket);
    const bucketMap = new Map<string, { name: string; colorKey: string; tasks: BacklogTask[] }>();

    for (const task of localTasks) {
      if (!task.bucket) continue;
      const existing = bucketMap.get(task.bucket.id);
      if (existing) {
        existing.tasks.push(task);
      } else {
        bucketMap.set(task.bucket.id, {
          name: task.bucket.name,
          colorKey: task.bucket.colorKey,
          tasks: [task],
        });
      }
    }

    const bucketGroups = Array.from(bucketMap.entries());

    return (
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground pb-1">
          Sorted by urgency — highest priority and closest deadlines first
        </p>

        {/* Uncategorized group */}
        {uncategorized.length > 0 && (
          <div>
            <button
              onClick={() => toggleGroup("uncategorized")}
              className="flex items-center gap-2 w-full text-left py-1.5 px-1 rounded-md hover:bg-muted/50 transition-colors"
            >
              {collapsedGroups.has("uncategorized") ? (
                <ChevronRight className="size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="size-4 text-muted-foreground" />
              )}
              <span className="size-2.5 rounded-full bg-gray-400 shrink-0" />
              <span className="text-sm font-semibold">Uncategorized</span>
              <span className="text-xs text-muted-foreground">
                ({uncategorized.length})
              </span>
            </button>
            {!collapsedGroups.has("uncategorized") && (
              <div className="space-y-2 mt-2">
                {uncategorized.map((task, index) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    index={index}
                    isClaiming={claimingId === task.id}
                    isClaimed={claimedId === task.id}
                    onClaim={handleClaim}
                    showClaim={showClaim}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bucket groups */}
        {bucketGroups.map(([bucketId, group]) => {
          const color = BUCKET_COLORS[group.colorKey as BucketColorKey];
          const isCollapsed = collapsedGroups.has(bucketId);

          return (
            <div key={bucketId}>
              <button
                onClick={() => toggleGroup(bucketId)}
                className="flex items-center gap-2 w-full text-left py-1.5 px-1 rounded-md hover:bg-muted/50 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="size-4 text-muted-foreground" />
                )}
                <span
                  className={cn(
                    "size-2.5 rounded-full shrink-0",
                    color?.dotColor ?? "bg-gray-400"
                  )}
                />
                <span className="text-sm font-semibold">{group.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({group.tasks.length})
                </span>
              </button>
              {!isCollapsed && (
                <div className="space-y-2 mt-2">
                  {group.tasks.map((task, index) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      index={index}
                      isClaiming={claimingId === task.id}
                      isClaimed={claimedId === task.id}
                      onClaim={handleClaim}
                      showClaim={showClaim}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Flat list (default)
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground pb-1">
        Sorted by urgency — highest priority and closest deadlines first
      </p>
      {localTasks.map((task, index) => (
        <TaskRow
          key={task.id}
          task={task}
          index={index}
          isClaiming={claimingId === task.id}
          isClaimed={claimedId === task.id}
          onClaim={handleClaim}
          showClaim={showClaim}
        />
      ))}
    </div>
  );
}
