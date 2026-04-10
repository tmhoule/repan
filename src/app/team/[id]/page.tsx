"use client";

import { use, useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { ArrowLeft, Star, ClipboardList, ChevronDown, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { StreakFlame } from "@/components/gamification/streak-flame";
import { TaskCard } from "@/components/tasks/task-card";
import { useUser } from "@/components/user-context";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "paused" | "done" | "boulder";
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
  updatedAt?: string;
  createdAt?: string;
  blockerReason?: string | null;
  createdBy: { id: string; name: string; avatarColor: string } | null;
  assignedTo?: { id: string; name: string; avatarColor: string } | null;
}

interface Streak {
  streakType: string;
  currentCount: number;
  longestCount: number;
}

interface Todo {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
}

interface UserDetail {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  totalPoints: number;
  streaks: Streak[];
  taskStats: { status: string; _count: number }[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}


export default function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user: viewer } = useUser();
  const { mutate: swrMutate } = useSWRConfig();

  const canViewTodos = !!viewer && (viewer.isSuperAdmin || viewer.teamRole === "manager");

  const { data: user, isLoading: userLoading } = useSWR<UserDetail>(
    `/api/users/${id}`
  );
  const { data: tasksData, isLoading: tasksLoading } = useSWR<{ tasks: Task[] }>(
    `/api/tasks?assignedTo=${id}`
  );
  const { data: todosData } = useSWR<{ todos: Todo[] }>(
    canViewTodos ? `/api/todos?userId=${id}` : null
  );

  const tasks = tasksData?.tasks ?? [];
  const todos = todosData?.todos ?? [];
  const streaks = user?.streaks ?? [];

  const dailyStreak = streaks.find((s) => s.streakType === "daily_checkin");
  const momentumStreak = streaks.find((s) => s.streakType === "weekly_momentum");

  const boulderTasks = tasks.filter((t) => t.status === "boulder");
  const stalledOrBlockedTasks = tasks.filter(
    (t) => t.status === "stalled" || t.status === "blocked" || t.status === "paused"
  );
  const activeTasks = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.status !== "boulder" &&
      t.status !== "stalled" &&
      t.status !== "blocked" &&
      t.status !== "paused"
  );
  const completedTasks = tasks.filter((t) => t.status === "done");
  const totalBoulderAllocation = boulderTasks.reduce(
    (sum, t) => sum + (t.timeAllocation ?? 0),
    0
  );

  const handleTaskUpdate = () => {
    swrMutate(`/api/tasks?assignedTo=${id}`);
  };

  const [showCompleted, setShowCompleted] = useState(false);
  const [showTodos, setShowTodos] = useState(true);

  if (userLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted/50 animate-pulse" />
        <div className="h-32 rounded-xl bg-muted/50 animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="text-muted-foreground">Team member not found.</p>
        <Link href="/team">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="size-4" />
            Back to Team
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Back button */}
      <Link href="/team">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2">
          <ArrowLeft className="size-4" />
          Team
        </Button>
      </Link>

      {/* User header */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Avatar className="size-16 shrink-0">
              <AvatarFallback
                className="text-xl font-bold text-white"
                style={{ backgroundColor: user.avatarColor ?? "#6b7280" }}
              >
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold tracking-tight">{user.name}</h1>
              </div>

              <div className="flex items-center gap-3 flex-wrap text-sm">
                <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                  <span className="tabular-nums">
                    {(user.totalPoints ?? 0).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground font-normal">pts</span>
                </span>

                {dailyStreak && dailyStreak.currentCount > 0 && (
                  <StreakFlame
                    count={dailyStreak.currentCount}
                    label="Daily check-in"
                  />
                )}
                {momentumStreak && momentumStreak.currentCount > 0 && (
                  <StreakFlame
                    count={momentumStreak.currentCount}
                    label="Momentum"
                  />
                )}
              </div>
            </div>

            <Link href={`/profile/${user.id}`}>
              <Button variant="outline" size="sm">
                View Profile
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Tasks */}
      {tasksLoading ? (
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 && todos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <ClipboardList className="size-12 text-muted-foreground/40" />
          <div className="space-y-1">
            <p className="font-medium text-muted-foreground">No tasks yet</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active tasks */}
          {activeTasks.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
              {activeTasks.map((task) => (
                <TaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} />
              ))}
            </div>
          )}

          {/* To Dos (manager-gated) */}
          {canViewTodos && todos.length > 0 && (
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
                    <div
                      key={todo.id}
                      className="rounded-lg border border-border bg-card px-3 py-2"
                    >
                      <p className="text-sm font-medium line-clamp-1">{todo.title}</p>
                      {todo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {todo.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stalled / Blocked tasks */}
          {stalledOrBlockedTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <AlertCircle className="size-4 text-orange-500" />
                <span>{stalledOrBlockedTasks.length} stalled or blocked</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                {stalledOrBlockedTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} />
                ))}
              </div>
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
                    <TaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} />
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
                    <TaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
