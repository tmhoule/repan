"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveIcon } from "@/lib/badge-icons";

interface RecentBadge {
  id: string;
  earnedAt: string;
  user: { id: string; name: string; avatarColor: string };
  award: { name: string; icon: string; description: string };
}

interface RecentAchievementsProps {
  badges: RecentBadge[];
}

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export function RecentAchievements({ badges }: RecentAchievementsProps) {
  if (!badges || badges.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Recent Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-0.5">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors"
            >
              {/* Badge icon */}
              <span className="text-xl leading-none shrink-0" role="img" aria-hidden="true">
                {resolveIcon(badge.award.icon)}
              </span>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="text-sm leading-snug">
                  <span className="font-medium text-foreground">{badge.user.name}</span>
                  <span className="text-muted-foreground"> earned </span>
                  <span className="font-medium text-amber-500 dark:text-amber-400">
                    {badge.award.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {badge.award.description}
                </p>
              </div>

              {/* Timestamp */}
              <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                {relativeTime(badge.earnedAt)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
