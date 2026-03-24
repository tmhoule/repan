"use client";

import useSWR from "swr";
import { Package } from "lucide-react";
import { BacklogSummary } from "@/components/backlog/backlog-summary";
import { BacklogList } from "@/components/backlog/backlog-list";

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
  const { data, isLoading, mutate } = useSWR<BacklogResponse>("/api/backlog");

  const tasks = data?.tasks ?? [];
  const health = data?.health;
  const weeklyThroughput = data?.weeklyThroughput ?? 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Backlog</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading
            ? "Loading..."
            : `${tasks.length} unclaimed task${tasks.length !== 1 ? "s" : ""} in the queue`}
        </p>
      </div>

      {/* Summary bar */}
      {isLoading ? (
        <div className="h-28 rounded-xl bg-muted/50 animate-pulse" />
      ) : health ? (
        <BacklogSummary health={health} weeklyThroughput={weeklyThroughput} />
      ) : null}

      {/* Backlog list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="size-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">
              The backlog is empty
            </p>
            <p className="text-sm text-muted-foreground/70">
              All tasks have been claimed — great work!
            </p>
          </div>
        </div>
      ) : (
        <BacklogList tasks={tasks} onMutate={() => mutate()} />
      )}
    </div>
  );
}
