"use client";

import { Card, CardContent } from "@/components/ui/card";

interface BacklogHealth {
  totalItems: number;
  totalEffort: number;
  estimatedWeeks: number | null;
  trend: "growing" | "shrinking" | "stable";
}

interface BacklogSummaryProps {
  health: BacklogHealth;
  weeklyThroughput: number;
}

const trendConfig = {
  growing: {
    icon: "↑",
    label: "Growing",
    className: "text-red-600 dark:text-red-400",
  },
  shrinking: {
    icon: "↓",
    label: "Shrinking",
    className: "text-green-600 dark:text-green-400",
  },
  stable: {
    icon: "→",
    label: "Stable",
    className: "text-gray-500 dark:text-gray-400",
  },
};

function formatWeeks(weeks: number | null): string {
  if (weeks === null) return "Unknown";
  if (weeks < 1) return "< 1 week";
  if (weeks < 4) return `~${Math.round(weeks)} week${Math.round(weeks) !== 1 ? "s" : ""}`;
  const months = weeks / 4;
  if (months < 2) return "~1–2 months";
  return `~${Math.floor(months)}–${Math.ceil(months)} months`;
}

export function BacklogSummary({ health, weeklyThroughput }: BacklogSummaryProps) {
  const trend = trendConfig[health.trend];

  return (
    <Card className="border-border/60 bg-card/80">
      <CardContent className="pt-5 pb-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {/* Total items */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Items
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums">
                {health.totalItems}
              </span>
              <span className="text-sm text-muted-foreground">tasks</span>
            </div>
          </div>

          {/* Total effort */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Effort
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums">
                {health.totalEffort}
              </span>
              <span className="text-sm text-muted-foreground">pts</span>
            </div>
          </div>

          {/* Estimated weeks */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Est. Duration
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tabular-nums leading-none">
                {health.estimatedWeeks !== null
                  ? health.estimatedWeeks < 1
                    ? "<1"
                    : Math.round(health.estimatedWeeks)
                  : "—"}
              </span>
              <span className="text-sm text-muted-foreground">
                {health.estimatedWeeks !== null && health.estimatedWeeks >= 1
                  ? `wk${Math.round(health.estimatedWeeks) !== 1 ? "s" : ""}`
                  : health.estimatedWeeks !== null
                  ? "wk"
                  : ""}
              </span>
            </div>
            {weeklyThroughput > 0 && (
              <span className="text-xs text-muted-foreground/70">
                @ {weeklyThroughput.toFixed(1)} pts/wk
              </span>
            )}
            {weeklyThroughput === 0 && (
              <span className="text-xs text-muted-foreground/70">
                No throughput data
              </span>
            )}
          </div>

          {/* Trend */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Trend
            </span>
            <div className={`flex items-center gap-1.5 ${trend.className}`}>
              <span className="text-2xl font-bold leading-none">
                {trend.icon}
              </span>
              <span className="text-sm font-medium">{trend.label}</span>
            </div>
          </div>
        </div>

        {/* Effort bar visualization */}
        {health.totalEffort > 0 && (
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Backlog effort</span>
              <span>{health.totalEffort} pts total</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary/50 transition-all duration-500"
                style={{
                  width: `${Math.min(100, (health.totalEffort / Math.max(health.totalEffort, 20)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
