"use client";

import { useState } from "react";
import useSWR from "swr";
import { Package } from "lucide-react";
import { BacklogSummary } from "@/components/backlog/backlog-summary";
import { BacklogList } from "@/components/backlog/backlog-list";
import { BucketFilterBar } from "@/components/buckets/bucket-filter-bar";
import { ManageBucketsDialog } from "@/components/buckets/manage-buckets-dialog";
import { useUser } from "@/components/user-context";

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
  createdBy: { id: string; name: string; avatarColor: string };
  forecast?: ForecastResult;
  bucket: { id: string; name: string; colorKey: string } | null;
}

interface BacklogHealth {
  totalItems: number;
  totalEffort: number;
  estimatedWeeks: number | null;
  trend: "growing" | "shrinking" | "stable";
}

interface BacklogResponse {
  tasks: BacklogTask[];
  health: BacklogHealth;
  weeklyThroughput: number;
}

export default function BacklogPage() {
  const { user } = useUser();
  const isManager = user?.role === "manager";
  const { data, isLoading, mutate } = useSWR<BacklogResponse>("/api/backlog");
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const { data: bucketsData, mutate: mutateBuckets } = useSWR<{
    buckets: { id: string; name: string; colorKey: string }[];
    teamId: string;
  }>("/api/buckets");
  const buckets = bucketsData?.buckets ?? [];
  const teamId = bucketsData?.teamId;

  const tasks = data?.tasks ?? [];
  const health = data?.health;
  const weeklyThroughput = data?.weeklyThroughput ?? 0;

  const uncategorizedCount = tasks.filter((t) => !t.bucket).length;
  const filteredTasks =
    selectedBucket === null
      ? tasks
      : selectedBucket === "uncategorized"
        ? tasks.filter((t) => !t.bucket)
        : tasks.filter((t) => t.bucket?.id === selectedBucket);
  const showGrouped = selectedBucket === null && buckets.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backlog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading..."
              : `${tasks.length} unclaimed task${tasks.length !== 1 ? "s" : ""} in the queue`}
          </p>
        </div>
        {isManager && teamId && (
          <ManageBucketsDialog
            teamId={teamId}
            onMutate={() => {
              mutateBuckets();
              mutate();
            }}
          />
        )}
      </div>

      {/* Summary bar */}
      {isLoading ? (
        <div className="h-28 rounded-xl bg-muted/50 animate-pulse" />
      ) : health ? (
        <BacklogSummary health={health} weeklyThroughput={weeklyThroughput} />
      ) : null}

      {/* Bucket filter bar */}
      {buckets.length > 0 && (
        <BucketFilterBar
          buckets={buckets}
          selected={selectedBucket}
          onSelect={setSelectedBucket}
          uncategorizedCount={uncategorizedCount}
        />
      )}

      {/* Backlog list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="size-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">
              {tasks.length === 0
                ? "The backlog is empty"
                : "No tasks in this bucket"}
            </p>
            <p className="text-sm text-muted-foreground/70">
              {tasks.length === 0
                ? "All tasks have been claimed — great work!"
                : "Try selecting a different filter above."}
            </p>
          </div>
        </div>
      ) : (
        <BacklogList
          tasks={filteredTasks}
          onMutate={() => mutate()}
          groupByBucket={showGrouped}
        />
      )}
    </div>
  );
}
