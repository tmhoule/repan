"use client";

import Link from "next/link";
import useSWR from "swr";
import { Users, Clock, AlertTriangle } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StreakFlame } from "@/components/gamification/streak-flame";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";

interface UserSummary {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  percentComplete: number;
  dueDate: string | null;
  effortEstimate: string;
  blockerReason?: string | null;
  updatedAt?: string;
  createdAt?: string;
}

interface Streak {
  streakType: string;
  currentCount: number;
}

interface UserDetail {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  totalPoints: number;
  streaks: Streak[];
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDue(dateStr: string | null): { label: string; className: string } | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  const diff = (due.getTime() - now.getTime()) / 86400000;
  const formatted = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (diff < 0) return { label: `Overdue · ${formatted}`, className: "text-red-400" };
  if (diff <= 2) return { label: `Due ${formatted}`, className: "text-amber-400" };
  return { label: `Due ${formatted}`, className: "text-muted-foreground" };
}

function countRisks(tasks: Task[]): { stale: number; behind: number; blocked: number; overdue: number } {
  const now = new Date();
  let stale = 0, behind = 0, blocked = 0, overdue = 0;
  for (const t of tasks) {
    if (t.status === "done" || t.status === "boulder") continue;
    if (t.status === "blocked") { blocked++; continue; }
    if (t.dueDate && new Date(t.dueDate) < now) { overdue++; continue; }
    // Stale: no update in 3+ days for in_progress
    const lastUpdate = t.updatedAt ? new Date(t.updatedAt) : (t.createdAt ? new Date(t.createdAt) : now);
    const daysSince = (now.getTime() - lastUpdate.getTime()) / 86400000;
    if (t.status === "in_progress" && daysSince >= 3) { stale++; continue; }
    if (t.status === "not_started" && t.dueDate && daysSince >= 5) { stale++; continue; }
    // Behind schedule
    if (t.dueDate && t.createdAt) {
      const created = new Date(t.createdAt);
      const due = new Date(t.dueDate);
      const total = due.getTime() - created.getTime();
      if (total > 0) {
        const elapsed = now.getTime() - created.getTime();
        const expected = Math.min(100, (elapsed / total) * 100);
        if (t.percentComplete < expected - 25) { behind++; }
      }
    }
  }
  return { stale, behind, blocked, overdue };
}

function TeamMemberSection({ user }: { user: UserSummary }) {
  const { data: detail } = useSWR<UserDetail>(`/api/users/${user.id}`);
  const { data: tasksData } = useSWR<{ tasks: Task[] }>(`/api/tasks?assignedTo=${user.id}`);

  const tasks = tasksData?.tasks ?? [];
  const boulderTasks = tasks.filter((t) => t.status === "boulder");
  const activeTasks = tasks.filter((t) => t.status !== "done" && t.status !== "boulder");
  const doneTasks = tasks.filter((t) => t.status === "done");
  const totalBoulderAllocation = boulderTasks.reduce((sum, t) => sum + ((t as any).timeAllocation ?? 0), 0);
  const risks = countRisks(tasks);
  const totalRisks = risks.stale + risks.behind + risks.blocked + risks.overdue;
  const streaks = detail?.streaks ?? [];
  const dailyStreak = streaks.find((s) => s.streakType === "daily_checkin");
  const totalPoints = detail?.totalPoints ?? 0;

  return (
    <div className="space-y-2">
      {/* User header row */}
      <div className="flex items-center gap-3 py-3 px-4 rounded-xl bg-card border border-border">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback
            className="text-sm font-bold text-white"
            style={{ backgroundColor: user.avatarColor ?? "#6b7280" }}
          >
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${user.id}`}
              className="font-semibold text-sm hover:text-primary hover:underline transition-colors"
            >
              {user.name}
            </Link>
            <Badge
              variant={user.role === "manager" ? "default" : "secondary"}
              className="text-[10px]"
            >
              {user.role}
            </Badge>
            {totalRisks > 0 && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  risks.blocked > 0 || risks.overdue > 0
                    ? "bg-red-500/15 text-red-400"
                    : "bg-amber-500/15 text-amber-400"
                }`}
                title={[
                  risks.blocked > 0 && `${risks.blocked} blocked`,
                  risks.overdue > 0 && `${risks.overdue} overdue`,
                  risks.behind > 0 && `${risks.behind} behind schedule`,
                  risks.stale > 0 && `${risks.stale} stale`,
                ].filter(Boolean).join(", ")}
              >
                <AlertTriangle className="size-2.5" />
                {totalRisks} at risk
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
            <span>{activeTasks.length} active task{activeTasks.length !== 1 ? "s" : ""}</span>
            {totalBoulderAllocation > 0 && (
              <span className="text-purple-600 dark:text-purple-400">
                🪨 {totalBoulderAllocation}% allocated
              </span>
            )}
            {totalPoints > 0 && <span>★ {totalPoints} pts</span>}
          </div>
        </div>

        {dailyStreak && dailyStreak.currentCount > 0 && (
          <StreakFlame count={dailyStreak.currentCount} className="shrink-0" />
        )}
      </div>

      {/* Task list under this user */}
      {activeTasks.length > 0 ? (
        <div className="ml-6 border-l-2 border-border pl-4 space-y-1.5">
          {activeTasks.map((task) => {
            const due = formatDue(task.dueDate);
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                {/* Progress circle */}
                <div className="relative size-8 shrink-0">
                  <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/50" />
                    <circle
                      cx="16" cy="16" r="13" fill="none" strokeWidth="2"
                      stroke={task.status === "blocked" ? "#EF4444" : task.status === "stalled" ? "#F97316" : "#8B5CF6"}
                      strokeDasharray={`${(task.percentComplete / 100) * 81.68} 81.68`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums">
                    {task.percentComplete}
                  </span>
                </div>

                {/* Title + due date */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="text-sm font-medium hover:text-primary hover:underline transition-colors line-clamp-1"
                  >
                    {task.title}
                  </Link>
                  {due && (
                    <div className={`flex items-center gap-1 text-[11px] mt-0.5 ${due.className}`}>
                      <Clock className="size-2.5" />
                      <span>{due.label}</span>
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <StatusBadge status={task.status as "not_started" | "in_progress" | "blocked" | "stalled" | "done" | "boulder"} />
                  <PriorityBadge priority={task.priority as "high" | "medium" | "low"} />
                </div>
              </div>
            );
          })}
          {doneTasks.length > 0 && (
            <p className="text-[11px] text-muted-foreground/50 pl-3 pt-1">
              + {doneTasks.length} completed
            </p>
          )}
        </div>
      ) : (
        <div className="ml-6 border-l-2 border-border pl-4 py-2">
          <p className="text-xs text-muted-foreground/50 italic">No active tasks</p>
        </div>
      )}

      {/* Boulder tasks */}
      {boulderTasks.length > 0 && (
        <div className="ml-6 border-l-2 border-purple-300 dark:border-purple-700 pl-4 space-y-1.5 mt-1.5">
          <p className="text-[11px] font-medium text-purple-600 dark:text-purple-400 pb-0.5">Boulders</p>
          {boulderTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors"
            >
              {/* Time allocation circle */}
              <div className="relative size-8 shrink-0">
                <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/50" />
                  <circle
                    cx="16" cy="16" r="13" fill="none" strokeWidth="2"
                    stroke="#8B5CF6"
                    strokeDasharray={`${((task as any).timeAllocation ?? 0) / 100 * 81.68} 81.68`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold tabular-nums text-purple-600 dark:text-purple-400">
                  {(task as any).timeAllocation ?? 0}
                </span>
              </div>

              {/* Title */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/tasks/${task.id}`}
                  className="text-sm font-medium hover:text-primary hover:underline transition-colors line-clamp-1"
                >
                  {task.title}
                </Link>
                <p className="text-[11px] text-purple-500 dark:text-purple-400 mt-0.5">
                  {(task as any).timeAllocation ?? 0}% of time
                </p>
              </div>

              {/* Badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusBadge status="boulder" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TeamPage() {
  const { data: users, isLoading } = useSWR<UserSummary[]>("/api/users");

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading
            ? "Loading..."
            : `${(users ?? []).length} member${(users ?? []).length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (users ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <Users className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">No team members found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(users ?? []).map((user) => (
            <TeamMemberSection key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
