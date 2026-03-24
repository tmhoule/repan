"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Plus, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskFilters, TaskFiltersState } from "@/components/tasks/task-filters";
import { PointsSummary } from "@/components/gamification/points-summary";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "done";
type TaskPriority = "high" | "medium" | "low";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  percentComplete: number;
  dueDate: string | null;
  blockerReason?: string | null;
  createdBy: { id: string; name: string; avatarColor: string };
  assignedTo?: { id: string; name: string; avatarColor: string } | null;
}

export default function MyTasksPage() {
  const [filters, setFilters] = useState<TaskFiltersState>({
    statuses: [],
    priority: "",
    search: "",
  });

  // Build query string for API
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    filters.statuses.forEach((s) => params.append("status", s));
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.search) params.set("search", filters.search);
    return params.toString();
  }, [filters]);

  const { data, isLoading, mutate } = useSWR<{ tasks: Task[] }>(
    `/api/tasks${queryString ? `?${queryString}` : ""}`
  );

  const tasks = data?.tasks ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading..."
              : `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link href="/tasks/new">
          <Button className="gap-2">
            <Plus className="size-4" />
            Create Task
          </Button>
        </Link>
      </div>

      {/* Points & streaks summary */}
      <PointsSummary />

      {/* Filters */}
      <TaskFilters filters={filters} onChange={setFilters} />

      {/* Task list */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-xl bg-muted/50 animate-pulse"
            />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <ClipboardList className="size-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">
              {filters.statuses.length > 0 ||
              filters.priority ||
              filters.search
                ? "No tasks match your filters"
                : "No tasks yet"}
            </p>
            <p className="text-sm text-muted-foreground/70">
              {filters.statuses.length > 0 ||
              filters.priority ||
              filters.search ? (
                "Try adjusting your filters"
              ) : (
                <>
                  Get started by{" "}
                  <Link
                    href="/tasks/new"
                    className="text-primary hover:underline"
                  >
                    creating your first task
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onUpdate={() => mutate()} />
          ))}
        </div>
      )}
    </div>
  );
}
