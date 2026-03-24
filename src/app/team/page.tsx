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

function TeamMemberSection({ user }: { user: UserSummary }) {
  const { data: detail } = useSWR<UserDetail>(`/api/users/${user.id}`);
  const { data: tasksData } = useSWR<{ tasks: Task[] }>(`/api/tasks?assignedTo=${user.id}`);

  const tasks = tasksData?.tasks ?? [];
  const activeTasks = tasks.filter((t) => t.status !== "done");
  const doneTasks = tasks.filter((t) => t.status === "done");
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
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{activeTasks.length} active task{activeTasks.length !== 1 ? "s" : ""}</span>
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
                  <StatusBadge status={task.status} />
                  <PriorityBadge priority={task.priority} />
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
    </div>
  );
}

export default function TeamPage() {
  const { data: users, isLoading } = useSWR<UserSummary[]>("/api/users");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
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
