"use client";

import useSWR from "swr";
import { Star } from "lucide-react";
import { useUser } from "@/components/user-context";
import { StreakFlame } from "@/components/gamification/streak-flame";
import { cn } from "@/lib/utils";

interface Streak {
  id: string;
  streakType: string;
  currentCount: number;
  longestCount: number;
  lastActivity: string;
}

interface PointsSummaryProps {
  className?: string;
}

export function PointsSummary({ className }: PointsSummaryProps) {
  const { user } = useUser();

  const { data: pointsData } = useSWR<{ totalPoints: number }>(
    user ? `/api/points?userId=${user.id}` : null
  );

  const { data: userData } = useSWR<{ streaks: Streak[] }>(
    user ? `/api/users/${user.id}` : null
  );

  const totalPoints = pointsData?.totalPoints ?? 0;
  const streaks = userData?.streaks ?? [];

  const dailyStreak = streaks.find((s) => s.streakType === "daily_checkin");
  const momentumStreak = streaks.find((s) => s.streakType === "weekly_momentum");

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 text-sm",
        className
      )}
    >
      {/* Total Points */}
      <div className="flex items-center gap-1.5 font-semibold text-amber-600 dark:text-amber-400">
        <Star className="size-4 fill-amber-500 text-amber-500" />
        <span className="tabular-nums">{totalPoints.toLocaleString()}</span>
        <span className="text-muted-foreground font-normal">pts</span>
      </div>

      {/* Streaks */}
      {(dailyStreak && dailyStreak.currentCount > 0) ||
      (momentumStreak && momentumStreak.currentCount > 0) ? (
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">|</span>
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
      ) : null}
    </div>
  );
}
