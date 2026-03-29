"use client";

import {
  CheckCircle2,
  PlusCircle,
  Archive,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Pause,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReportSummaryData {
  tasksCompleted: number;
  tasksCreated: number;
  backlogSize: number;
  backlogDelta: number;
  missedDeadlines: number;
  staleTasks?: number;
  behindScheduleTasks?: number;
  activeBoulderCount?: number;
  totalBoulderAllocation?: number;
  period: string;
  prevTasksCompleted?: number;
  prevTasksCreated?: number;
  prevMissedDeadlines?: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: React.ReactNode;
  highlight?: "positive" | "negative" | "neutral";
  delta?: { value: number; inverted?: boolean; label: string };
}

function StatCard({ title, value, icon, sub, highlight, delta }: StatCardProps) {
  const highlightClass =
    highlight === "positive"
      ? "text-emerald-500"
      : highlight === "negative"
        ? "text-red-500"
        : "text-zinc-100";

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold text-zinc-400 tracking-wide uppercase flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold tabular-nums ${highlightClass}`}>
          {value}
        </p>
        {delta && delta.value !== 0 && (
          <p className={`text-xs font-medium mt-0.5 ${
            delta.inverted
              ? (delta.value > 0 ? "text-red-400" : "text-emerald-400")
              : (delta.value > 0 ? "text-emerald-400" : "text-red-400")
          }`}>
            {delta.value > 0 ? "+" : ""}{delta.value} vs last {delta.label}
          </p>
        )}
        {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function BacklogDeltaIcon({ delta }: { delta: number }) {
  if (delta > 0) return <TrendingUp className="size-3.5" />;
  if (delta < 0) return <TrendingDown className="size-3.5" />;
  return <Minus className="size-3.5" />;
}

export function ReportSummary({ data }: { data: ReportSummaryData }) {
  const { tasksCompleted, tasksCreated, backlogSize, backlogDelta, missedDeadlines, staleTasks, behindScheduleTasks, activeBoulderCount, totalBoulderAllocation, period, prevTasksCompleted, prevTasksCreated, prevMissedDeadlines } = data;
  const periodLabel = period === "monthly" ? "month" : "week";

  const deltaSign = backlogDelta > 0 ? "+" : "";
  const deltaHighlight: "positive" | "negative" | "neutral" =
    backlogDelta < 0 ? "positive" : backlogDelta > 0 ? "negative" : "neutral";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
      <StatCard
        title="Completed"
        value={tasksCompleted}
        icon={<CheckCircle2 className="size-3.5 text-emerald-500" />}
        sub="tasks finished this period"
        highlight="positive"
        delta={{ value: tasksCompleted - (prevTasksCompleted ?? tasksCompleted), label: periodLabel }}
      />
      <StatCard
        title="Created"
        value={tasksCreated}
        icon={<PlusCircle className="size-3.5 text-blue-400" />}
        sub="new tasks added"
        delta={{ value: tasksCreated - (prevTasksCreated ?? tasksCreated), label: periodLabel }}
      />
      <StatCard
        title="Backlog Size"
        value={backlogSize}
        icon={<Archive className="size-3.5 text-zinc-400" />}
        sub="unassigned items"
      />
      <StatCard
        title="Backlog Delta"
        value={`${deltaSign}${backlogDelta}`}
        icon={<BacklogDeltaIcon delta={backlogDelta} />}
        sub={backlogDelta === 0 ? "no change" : backlogDelta > 0 ? "backlog growing" : "backlog shrinking"}
        highlight={deltaHighlight}
      />
      <StatCard
        title="Missed Deadlines"
        value={missedDeadlines}
        icon={<AlertTriangle className="size-3.5 text-amber-400" />}
        sub="completed after due date"
        highlight={missedDeadlines > 0 ? "negative" : "positive"}
        delta={{ value: missedDeadlines - (prevMissedDeadlines ?? missedDeadlines), inverted: true, label: periodLabel }}
      />
      {(staleTasks ?? 0) > 0 && (
        <StatCard
          title="Stale Tasks"
          value={staleTasks!}
          icon={<Pause className="size-3.5 text-amber-400" />}
          sub="no activity in 3+ days"
          highlight={staleTasks! > 0 ? "negative" : "neutral"}
        />
      )}
      {(behindScheduleTasks ?? 0) > 0 && (
        <StatCard
          title="Behind Schedule"
          value={behindScheduleTasks!}
          icon={<TrendingDown className="size-3.5 text-red-400" />}
          sub="progress below expected pace"
          highlight={behindScheduleTasks! > 0 ? "negative" : "neutral"}
        />
      )}
      {(activeBoulderCount ?? 0) > 0 && (
        <StatCard
          title="Boulders"
          value={`${activeBoulderCount} active`}
          icon={<span className="text-sm">🪨</span>}
          sub={`${totalBoulderAllocation}% total time allocated`}
        />
      )}
    </div>
  );
}
