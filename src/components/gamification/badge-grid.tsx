"use client";

import { cn } from "@/lib/utils";
import { resolveIcon } from "@/lib/badge-icons";

export interface Award {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteriaType: string;
  criteriaValue: unknown;
  isActive: boolean;
  createdAt: string;
}

interface BadgeGridProps {
  badges: Award[];
  earnedBadgeIds: Set<string>;
  earnedDates: Record<string, string>;
}

function BadgeIcon({ icon, earned }: { icon: string; earned: boolean }) {
  const emoji = resolveIcon(icon);

  return (
    <span
      className={cn("text-4xl leading-none transition-all", !earned && "grayscale opacity-50")}
      role="img"
      aria-hidden="true"
    >
      {emoji}
    </span>
  );
}

function formatEarnedDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BadgeGrid({ badges, earnedBadgeIds, earnedDates }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No badges available yet.
      </p>
    );
  }

  // Sort: earned first, then locked
  const sorted = [...badges].sort((a, b) => {
    const aEarned = earnedBadgeIds.has(a.id);
    const bEarned = earnedBadgeIds.has(b.id);
    if (aEarned && !bEarned) return -1;
    if (!aEarned && bEarned) return 1;
    return 0;
  });

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {sorted.map((badge) => {
        const earned = earnedBadgeIds.has(badge.id);
        const earnedDate = earnedDates[badge.id];

        return (
          <div
            key={badge.id}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all",
              earned
                ? "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30 shadow-sm"
                : "border-border bg-muted/30 opacity-60"
            )}
          >
            <BadgeIcon icon={badge.icon} earned={earned} />

            <div className="space-y-0.5 min-w-0 w-full">
              <p
                className={cn(
                  "text-xs font-semibold leading-snug truncate",
                  earned ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {badge.name}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                {badge.description}
              </p>
            </div>

            {earned && earnedDate ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium tabular-nums">
                {formatEarnedDate(earnedDate)}
              </p>
            ) : !earned ? (
              <p className="text-xs text-muted-foreground/60 flex items-center gap-1">
                <span aria-hidden="true">🔒</span>
                <span>Locked</span>
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
