"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BacklogHealthData {
  totalItems: number;
  totalEffort: number;
  estimatedWeeks: number | null;
  trend: "growing" | "shrinking" | "stable";
}

interface BacklogHealthProps {
  data: BacklogHealthData;
}

function TrendIcon({ trend }: { trend: BacklogHealthData["trend"] }) {
  if (trend === "growing")
    return <TrendingUp className="h-5 w-5 text-red-400" />;
  if (trend === "shrinking")
    return <TrendingDown className="h-5 w-5 text-green-400" />;
  return <Minus className="h-5 w-5 text-muted-foreground" />;
}

function trendLabel(trend: BacklogHealthData["trend"]) {
  if (trend === "growing") return { text: "Growing", color: "text-red-400" };
  if (trend === "shrinking") return { text: "Shrinking", color: "text-green-400" };
  return { text: "Stable", color: "text-muted-foreground" };
}

function formatWeeks(weeks: number | null): string {
  if (weeks === null) return "—";
  if (weeks < 1) return "< 1 wk";
  if (weeks < 2) return "~1-2 wks";
  if (weeks < 4) return `~${Math.round(weeks)} wks`;
  const months = weeks / 4.33;
  if (months < 2) return "~1-2 mo";
  return `~${Math.round(months)} mo`;
}

export function BacklogHealth({ data }: BacklogHealthProps) {
  const { totalItems, totalEffort, estimatedWeeks, trend } = data;
  const trendInfo = trendLabel(trend);

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Backlog Health
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-accent/40 border border-border p-3 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Items</span>
            <span className="text-2xl font-bold text-foreground tabular-nums">{totalItems}</span>
          </div>
          <div className="rounded-lg bg-accent/40 border border-border p-3 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Effort pts</span>
            <span className="text-2xl font-bold text-foreground tabular-nums">{totalEffort}</span>
          </div>
          <div className="rounded-lg bg-accent/40 border border-border p-3 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Est. runway</span>
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {formatWeeks(estimatedWeeks)}
            </span>
          </div>
          <div className="rounded-lg bg-accent/40 border border-border p-3 flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Trend</span>
            <div className="flex items-center gap-1.5">
              <TrendIcon trend={trend} />
              <span className={`text-base font-semibold ${trendInfo.color}`}>
                {trendInfo.text}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
