"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  ArrowLeft,
  Star,
  Trophy,
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StreakFlame } from "@/components/gamification/streak-flame";
import { BadgeGrid, Award } from "@/components/gamification/badge-grid";

interface Streak {
  id: string;
  streakType: string;
  currentCount: number;
  longestCount: number;
  lastActivity: string;
}

interface UserAwardEntry {
  earnedAt: string;
  award: Award;
}

interface UserDetail {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  totalPoints: number;
  totalCompleted: number;
  onTimeRate: number | null;
  avgCompletionDays: number | null;
  streaks: Streak[];
  userAwards: UserAwardEntry[];
  taskStats: { status: string; _count: number }[];
}

interface PointsEntry {
  id: string;
  actionType: string;
  points: number;
  timestamp: string;
  task: { id: string; title: string } | null;
}

interface PointsData {
  points: PointsEntry[];
  totalPoints: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatActionType(actionType: string): string {
  return actionType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatStreakType(type: string): string {
  const labels: Record<string, string> = {
    daily_checkin: "Daily Check-in",
    weekly_momentum: "Momentum",
  };
  return (
    labels[type] ??
    type
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const { data: user, isLoading: userLoading } = useSWR<UserDetail>(
    `/api/users/${id}`
  );
  const { data: pointsData, isLoading: pointsLoading } = useSWR<PointsData>(
    `/api/points?userId=${id}`
  );
  const { data: allBadges, isLoading: badgesLoading } = useSWR<Award[]>(
    "/api/awards"
  );

  const isLoading = userLoading || pointsLoading || badgesLoading;

  const streaks = user?.streaks ?? [];
  const userAwards = user?.userAwards ?? [];
  const pointsEntries = pointsData?.points ?? [];
  const badges = allBadges ?? [];

  const earnedBadgeIds = new Set(userAwards.map((ua) => ua.award.id));
  const earnedDates: Record<string, string> = {};
  userAwards.forEach((ua) => {
    earnedDates[ua.award.id] = ua.earnedAt;
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <div className="h-8 w-48 rounded-lg bg-muted/50 animate-pulse" />
        <div className="h-32 rounded-xl bg-muted/50 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="text-muted-foreground">Profile not found.</p>
        <Link href="/team">
          <Button variant="outline" className="mt-4 gap-2">
            <ArrowLeft className="size-4" />
            Back to Team
          </Button>
        </Link>
      </div>
    );
  }

  const activeTasks = (user.taskStats ?? [])
    .filter((s) => s.status !== "done")
    .reduce((sum, s) => sum + s._count, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-8">
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
            <Avatar className="size-20 shrink-0">
              <AvatarFallback
                className="text-2xl font-bold text-white"
                style={{ backgroundColor: user.avatarColor ?? "#6b7280" }}
              >
                {getInitials(user.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
                <Badge variant={user.role === "manager" ? "default" : "secondary"}>
                  {user.role}
                </Badge>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
                  <Star className="size-4 fill-amber-500 text-amber-500" />
                  <span className="tabular-nums text-lg">
                    {(user.totalPoints ?? 0).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground font-normal text-sm">pts</span>
                </span>

                {streaks.map(
                  (s) =>
                    s.currentCount > 0 && (
                      <StreakFlame
                        key={s.id}
                        count={s.currentCount}
                        label={formatStreakType(s.streakType)}
                      />
                    )
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card size="sm">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CheckCircle2 className="size-4" />
              <span className="text-xs font-medium">Completed</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {user.totalCompleted ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">tasks total</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="size-4" />
              <span className="text-xs font-medium">Active</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{activeTasks}</p>
            <p className="text-xs text-muted-foreground">in progress</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="size-4" />
              <span className="text-xs font-medium">On-time Rate</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {user.onTimeRate != null
                ? `${Math.round(user.onTimeRate * 100)}%`
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">of deadlines met</p>
          </CardContent>
        </Card>

        <Card size="sm">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="size-4" />
              <span className="text-xs font-medium">Avg Time</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {user.avgCompletionDays != null
                ? user.avgCompletionDays < 1
                  ? "<1"
                  : Math.round(user.avgCompletionDays).toString()
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">days to complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Streaks */}
      {streaks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span role="img" aria-label="fire">🔥</span>
            Streaks
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {streaks.map((s) => (
              <Card key={s.id} size="sm">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {formatStreakType(s.streakType)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Personal best: {s.longestCount} days
                      </p>
                    </div>
                    <StreakFlame
                      count={s.currentCount}
                      label={formatStreakType(s.streakType)}
                    />
                  </div>
                  {s.currentCount === 0 && (
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      No active streak
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Trophy className="size-5 text-amber-500" />
          Badges
          {earnedBadgeIds.size > 0 && (
            <Badge variant="secondary" className="ml-1">
              {earnedBadgeIds.size} / {badges.length}
            </Badge>
          )}
        </h2>
        <BadgeGrid
          badges={badges}
          earnedBadgeIds={earnedBadgeIds}
          earnedDates={earnedDates}
        />
      </div>

      <Separator />

      {/* Points history */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Star className="size-5 text-amber-500 fill-amber-500" />
          Points History
        </h2>

        {pointsEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No points earned yet.
          </p>
        ) : (
          <Card>
            <CardContent className="pt-4 px-0">
              <div className="divide-y divide-border">
                {pointsEntries.slice(0, 30).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {formatActionType(entry.actionType)}
                      </p>
                      {entry.task && (
                        <p className="text-xs text-muted-foreground truncate">
                          {entry.task.title}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={
                          entry.points >= 0
                            ? "text-sm font-semibold text-green-600 dark:text-green-400 tabular-nums"
                            : "text-sm font-semibold text-red-600 dark:text-red-400 tabular-nums"
                        }
                      >
                        {entry.points >= 0 ? "+" : ""}
                        {entry.points}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(entry.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {pointsEntries.length > 30 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing most recent 30 entries
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
