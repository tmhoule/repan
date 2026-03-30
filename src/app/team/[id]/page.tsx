"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Star, ClipboardList, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StreakFlame } from "@/components/gamification/streak-flame";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { cn } from "@/lib/utils";

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

interface Streak {
  streakType: string;
  currentCount: number;
  longestCount: number;
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

function formatDueDate(
  dateStr: string | null
): { label: string; className: string } | null {
  if (!dateStr) return null;
  // Parse as local date to avoid UTC→local timezone shift (off-by-one day)
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const formatted = due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  if (diffDays < 0)
    return { label: `Overdue · ${formatted}`, className: "text-red-600 dark:text-red-400" };
  if (diffDays <= 2)
    return { label: `Due ${formatted}`, className: "text-amber-600 dark:text-amber-400" };
  return { label: `Due ${formatted}`, className: "text-muted-foreground" };
}

function ReadOnlyTaskCard({ task }: { task: Task }) {
  const dueDateInfo = formatDueDate(task.dueDate);
  const isDone = task.status === "done";

  return (
    <Card className={cn("transition-opacity", isDone && "opacity-60")}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <Link
              href={`/tasks/${task.id}`}
              className="font-medium text-sm hover:text-primary hover:underline line-clamp-2 transition-colors"
            >
              {task.title}
            </Link>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {dueDateInfo && (
          <div className={cn("flex items-center gap-1 text-xs", dueDateInfo.className)}>
            <Clock className="size-3" />
            <span>{dueDateInfo.label}</span>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="tabular-nums">{task.percentComplete}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isDone ? "bg-green-500" : "bg-primary"
              )}
              style={{ width: `${task.percentComplete}%` }}
            />
          </div>
        </div>

        {task.status === "blocked" && task.blockerReason && (
          <div className="flex items-start gap-1.5 rounded-md bg-red-50 dark:bg-red-950/30 px-2 py-1.5 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="size-3 mt-0.5 shrink-0" />
            <span>{task.blockerReason}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function TeamMemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: user, isLoading: userLoading } = useSWR<UserDetail>(
    `/api/users/${id}`
  );
  const { data: tasksData, isLoading: tasksLoading } = useSWR<{ tasks: Task[] }>(
    `/api/tasks?assignedTo=${id}`
  );

  const tasks = tasksData?.tasks ?? [];
  const streaks = user?.streaks ?? [];

  const dailyStreak = streaks.find((s) => s.streakType === "daily_checkin");
  const momentumStreak = streaks.find((s) => s.streakType === "weekly_momentum");

  const activeTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");

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
                <Badge
                  variant={user.role === "manager" ? "default" : "secondary"}
                >
                  {user.role}
                </Badge>
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tasks</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {tasksLoading ? "..." : `${tasks.length} total`}
          </span>
        </div>

        {tasksLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
            <ClipboardList className="size-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-medium">
              No tasks assigned
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTasks.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Active ({activeTasks.length})
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {activeTasks.map((task) => (
                    <ReadOnlyTaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {activeTasks.length > 0 && doneTasks.length > 0 && (
              <Separator />
            )}

            {doneTasks.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Completed ({doneTasks.length})
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {doneTasks.map((task) => (
                    <ReadOnlyTaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
