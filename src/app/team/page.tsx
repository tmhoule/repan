"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StreakFlame } from "@/components/gamification/streak-flame";

interface UserSummary {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
}

interface Streak {
  streakType: string;
  currentCount: number;
  longestCount: number;
}

interface UserAwardEntry {
  earnedAt: string;
  award: {
    id: string;
    name: string;
    icon: string;
  };
}

interface TaskStat {
  status: string;
  _count: number;
}

interface UserDetail {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  streaks: Streak[];
  userAwards: UserAwardEntry[];
  taskStats: TaskStat[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getActiveTaskCount(taskStats: TaskStat[]): number {
  return taskStats
    .filter((s) => s.status !== "done")
    .reduce((sum, s) => sum + s._count, 0);
}

function getRecentBadges(userAwards: UserAwardEntry[]): UserAwardEntry[] {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return userAwards.filter(
    (ua) => new Date(ua.earnedAt) >= thirtyDaysAgo
  );
}

function TeamMemberCard({
  userId,
  summary,
}: {
  userId: string;
  summary: UserSummary;
}) {
  const router = useRouter();
  const { data: detail } = useSWR<UserDetail>(`/api/users/${userId}`);

  const streaks = detail?.streaks ?? [];
  const taskStats = detail?.taskStats ?? [];
  const userAwards = detail?.userAwards ?? [];

  const activeTaskCount = getActiveTaskCount(taskStats);
  const recentBadges = getRecentBadges(userAwards);

  const dailyStreak = streaks.find((s) => s.streakType === "daily_checkin");
  const momentumStreak = streaks.find((s) => s.streakType === "weekly_momentum");
  const bestStreak =
    dailyStreak && momentumStreak
      ? dailyStreak.currentCount >= momentumStreak.currentCount
        ? dailyStreak
        : momentumStreak
      : dailyStreak ?? momentumStreak;

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:ring-2 hover:ring-primary/20 active:scale-[0.99]"
      onClick={() => router.push(`/team/${userId}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") router.push(`/team/${userId}`);
      }}
      aria-label={`View ${summary.name}'s profile`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 shrink-0">
            <AvatarFallback
              className="text-sm font-bold text-white"
              style={{ backgroundColor: summary.avatarColor ?? "#6b7280" }}
            >
              {getInitials(summary.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-tight truncate">
              {summary.name}
            </p>
            <Badge
              variant={summary.role === "manager" ? "default" : "secondary"}
              className="mt-0.5 text-xs"
            >
              {summary.role}
            </Badge>
          </div>
          {bestStreak && bestStreak.currentCount > 0 && (
            <StreakFlame count={bestStreak.currentCount} className="shrink-0" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Task count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Active tasks</span>
          <span className="tabular-nums font-semibold text-foreground">
            {activeTaskCount}
          </span>
        </div>

        {/* Recent badges */}
        {recentBadges.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Recent badges</p>
            <div className="flex flex-wrap gap-1">
              {recentBadges.slice(0, 4).map((ua) => (
                <span
                  key={ua.award.id}
                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"
                  title={ua.award.name}
                >
                  <span role="img" aria-hidden="true">
                    {ua.award.icon}
                  </span>
                  <span className="truncate max-w-[80px]">{ua.award.name}</span>
                </span>
              ))}
              {recentBadges.length > 4 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{recentBadges.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}

        {recentBadges.length === 0 && (
          <p className="text-xs text-muted-foreground/60 italic">
            No badges earned this month
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function TeamPage() {
  const { data: users, isLoading } = useSWR<UserSummary[]>("/api/users");

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading
            ? "Loading..."
            : `${(users ?? []).length} member${(users ?? []).length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : (users ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <Users className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">No team members found</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          {(users ?? []).map((user) => (
            <TeamMemberCard key={user.id} userId={user.id} summary={user} />
          ))}
        </div>
      )}
    </div>
  );
}
