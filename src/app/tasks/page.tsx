"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { Plus, ClipboardList, Package, ChevronDown, ChevronRight, CheckCircle2 } from "lucide-react";
import { BucketFilterBar } from "@/components/buckets/bucket-filter-bar";
import { Button } from "@/components/ui/button";
import { TaskCard } from "@/components/tasks/task-card";
import { TodoCard } from "@/components/todos/todo-card";

import { PointsSummary } from "@/components/gamification/points-summary";
import { BacklogSummary } from "@/components/backlog/backlog-summary";
import { BacklogList } from "@/components/backlog/backlog-list";
import { Separator } from "@/components/ui/separator";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "done" | "boulder";
type TaskPriority = "high" | "medium" | "low";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  effortEstimate: "small" | "medium" | "large";
  percentComplete: number;
  timeAllocation: number;
  dueDate: string | null;
  blockerReason?: string | null;
  createdBy: { id: string; name: string; avatarColor: string } | null;
  assignedTo?: { id: string; name: string; avatarColor: string } | null;
}

export default function MyTasksPage() {
  const { data, isLoading, mutate } = useSWR<{ tasks: Task[] }>("/api/tasks");
  const { data: todosData, mutate: mutateTodos } = useSWR<{
    todos: { id: string; title: string; description: string | null; createdAt: string }[];
  }>("/api/todos");
  const todos = todosData?.todos ?? [];

  const tasks = data?.tasks ?? [];
  const boulderTasks = tasks.filter((t) => t.status === "boulder");
  const activeTasks = tasks.filter((t) => t.status !== "done" && t.status !== "boulder");
  const completedTasks = tasks.filter((t) => t.status === "done");
  const totalBoulderAllocation = boulderTasks.reduce((sum, t) => sum + (t.timeAllocation ?? 0), 0);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showTodos, setShowTodos] = useState(true);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading..."
              : `${activeTasks.length} active task${activeTasks.length !== 1 ? "s" : ""}${completedTasks.length > 0 ? ` · ${completedTasks.length} completed` : ""}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/todos/new" title="Quick personal reminder — no tracking or due dates">
            <Button variant="outline" className="gap-2">
              <Plus className="size-4" />
              Create To Do
            </Button>
          </Link>
          <Link href="/tasks/new?type=boulder" title="Ongoing effort with no end date — tracked by time allocation">
            <Button variant="outline" className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950">
              <Plus className="size-4" />
              Create Boulder
            </Button>
          </Link>
          <Link href="/tasks/new" title="Trackable work item with priority, effort, and due date">
            <Button className="gap-2">
              <Plus className="size-4" />
              Create Task
            </Button>
          </Link>
        </div>
      </div>

      {/* Points & streaks summary */}
      <PointsSummary />

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
      ) : activeTasks.length === 0 && completedTasks.length === 0 && boulderTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <ClipboardList className="size-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">No tasks yet</p>
            <p className="text-sm text-muted-foreground/70">
              Get started by{" "}
              <Link
                href="/tasks/new"
                className="text-primary hover:underline"
              >
                creating your first task
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active tasks */}
          {activeTasks.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
              {activeTasks.map((task) => (
                <TaskCard key={task.id} task={task} onUpdate={() => mutate()} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No active tasks</p>
          )}

          {/* To Dos */}
          {todos.length > 0 && (
            <div>
              <button
                onClick={() => setShowTodos((v) => !v)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {showTodos ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <span>{todos.length} to do{todos.length !== 1 ? "s" : ""}</span>
              </button>
              {showTodos && (
                <div className="space-y-1.5 mt-1">
                  {todos.map((todo) => (
                    <TodoCard key={todo.id} todo={todo} onDone={() => mutateTodos()} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Boulders section */}
          {boulderTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-purple-700 dark:text-purple-400">Boulders</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Ongoing operational efforts</p>
                </div>
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-full px-2.5 py-1">
                  {totalBoulderAllocation}% of time allocated
                </span>
              </div>
              <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/20 p-3">
                <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                  {boulderTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onUpdate={() => mutate()} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Completed tasks — collapsed section */}
          {completedTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                {showCompleted ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                <CheckCircle2 className="size-4 text-green-500" />
                <span>{completedTasks.length} completed task{completedTasks.length !== 1 ? "s" : ""}</span>
              </button>
              {showCompleted && (
                <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2 mt-2">
                  {completedTasks.map((task) => (
                    <TaskCard key={task.id} task={task} onUpdate={() => mutate()} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Backlog section */}
      <Separator className="my-4" />
      <BacklogSection />
    </div>
  );
}

function BacklogSection() {
  const { mutate: mutateGlobal } = useSWRConfig();
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);

  const { data, isLoading } = useSWR<{
    tasks: any[];
    health: { totalItems: number; totalEffort: number; estimatedWeeks: number | null; trend: "growing" | "shrinking" | "stable" };
    weeklyThroughput: number;
  }>("/api/backlog");

  const { data: bucketsData } = useSWR<{
    buckets: { id: string; name: string; colorKey: string }[];
  }>("/api/buckets");

  const backlogTasks = data?.tasks ?? [];
  const health = data?.health;
  const buckets = bucketsData?.buckets ?? [];

  const uncategorizedCount = backlogTasks.filter((t: any) => !t.bucket).length;
  const filteredTasks =
    selectedBucket === null
      ? backlogTasks
      : selectedBucket === "uncategorized"
        ? backlogTasks.filter((t: any) => !t.bucket)
        : backlogTasks.filter((t: any) => t.bucket?.id === selectedBucket);
  const showGrouped = selectedBucket === null && buckets.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Backlog</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Unclaimed tasks available to pick up
        </p>
      </div>

      {health && <BacklogSummary health={health} weeklyThroughput={data?.weeklyThroughput ?? 0} />}

      {buckets.length > 0 && (
        <BucketFilterBar
          buckets={buckets}
          selected={selectedBucket}
          onSelect={setSelectedBucket}
          uncategorizedCount={uncategorizedCount}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <Package className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {backlogTasks.length === 0 ? "Backlog is empty" : "No tasks in this bucket"}
          </p>
        </div>
      ) : (
        <BacklogList tasks={filteredTasks} onMutate={() => { mutateGlobal("/api/backlog"); mutateGlobal("/api/tasks"); }} groupByBucket={showGrouped} />
      )}
    </div>
  );
}
