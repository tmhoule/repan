"use client";

import { Activity, AlertTriangle, Inbox, Layers } from "lucide-react";

interface TeamSummaryProps {
  totalWip: number;
  atRiskCount: number;
  avgThroughput: number;
  backlogTrend: "growing" | "shrinking" | "stable";
  backlogSize: number;
  teamSize: number;
}

function SummaryPill({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: "warning" | "danger" | "positive" | "neutral";
}) {
  const colorClass =
    highlight === "danger"
      ? "text-red-400"
      : highlight === "warning"
        ? "text-amber-400"
        : highlight === "positive"
          ? "text-emerald-400"
          : "text-foreground";

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
      <span className="text-muted-foreground">{icon}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-lg font-bold tabular-nums ${colorClass}`}>{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export function TeamSummary({ totalWip, atRiskCount, avgThroughput, backlogTrend, backlogSize, teamSize }: TeamSummaryProps) {
  const trendLabel = backlogTrend === "growing" ? "growing" : backlogTrend === "shrinking" ? "shrinking" : "stable";
  const trendHighlight = backlogTrend === "growing" ? "warning" : backlogTrend === "shrinking" ? "positive" : "neutral";

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <SummaryPill
        icon={<Layers className="size-4" />}
        label="in progress"
        value={totalWip}
        highlight={totalWip > teamSize * 3 ? "warning" : "neutral"}
      />
      <SummaryPill
        icon={<AlertTriangle className="size-4" />}
        label="at risk"
        value={atRiskCount}
        highlight={atRiskCount > 0 ? "danger" : "neutral"}
      />
      <SummaryPill
        icon={<Activity className="size-4" />}
        label="pts/wk avg"
        value={avgThroughput}
      />
      <SummaryPill
        icon={<Inbox className="size-4" />}
        label={`backlog (${trendLabel})`}
        value={backlogSize}
        highlight={trendHighlight}
      />
    </div>
  );
}
