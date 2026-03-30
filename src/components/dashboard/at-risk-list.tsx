"use client";

import Link from "next/link";
import { AlertTriangle, Clock, Ban, Pause, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/tasks/status-badge";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "done";
type TaskPriority = "high" | "medium" | "low";

interface RiskFlag {
  riskType: string;
  label: string;
}

interface AtRiskTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  percentComplete?: number;
  dueDate?: string | null;
  assignedTo?: { id: string; name: string } | null;
  riskFlags?: RiskFlag[];
}

interface AtRiskListProps {
  tasks: AtRiskTask[];
}

function severityScore(task: AtRiskTask): number {
  const priorityScore = task.priority === "high" ? 100 : task.priority === "medium" ? 50 : 10;
  const flags = new Set((task.riskFlags ?? []).map((f) => f.riskType));

  if (flags.has("blocked")) return 400 + priorityScore;
  if (flags.has("overdue")) return 350 + priorityScore;
  if (flags.has("behind_schedule")) return 300 + priorityScore;
  if (flags.has("stale")) return 250 + priorityScore;
  if (flags.has("unassigned_approaching")) return 200 + priorityScore;
  if (flags.has("stalled")) return 150 + priorityScore;
  return 100 + priorityScore;
}

function getDueDateInfo(dueDate: string | null | undefined): { label: string; className: string } | null {
  if (!dueDate) return null;
  const [y, m, d] = dueDate.split("T")[0].split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, className: "text-orange-400" };
  if (diffDays === 0) return { label: "due today", className: "text-red-400" };
  if (diffDays === 1) return { label: "due tomorrow", className: "text-amber-400" };
  return { label: `due in ${diffDays}d`, className: "text-amber-400" };
}

function RiskIcon({ task }: { task: AtRiskTask }) {
  const flags = new Set((task.riskFlags ?? []).map((f) => f.riskType));
  if (flags.has("blocked"))
    return <Ban className="h-3.5 w-3.5 text-red-400 shrink-0" />;
  if (flags.has("overdue"))
    return <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0" />;
  if (flags.has("behind_schedule"))
    return <TrendingDown className="h-3.5 w-3.5 text-red-400 shrink-0" />;
  if (flags.has("stale"))
    return <Pause className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
  if (flags.has("unassigned_approaching"))
    return <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />;
  return <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />;
}

function SummaryPill({ count, label, className }: { count: number; label: string; className: string }) {
  if (count === 0) return null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${className}`}>
      {count} {label}
    </span>
  );
}

export function AtRiskList({ tasks }: AtRiskListProps) {
  const sorted = [...tasks].sort((a, b) => severityScore(b) - severityScore(a));

  // Count by risk category (a task may have multiple flags — count its primary/highest)
  const counts = { blocked: 0, overdue: 0, behind: 0, stale: 0, unassigned: 0, stalled: 0 };
  for (const task of tasks) {
    const flags = new Set((task.riskFlags ?? []).map((f) => f.riskType));
    if (flags.has("blocked")) counts.blocked++;
    else if (flags.has("overdue")) counts.overdue++;
    else if (flags.has("behind_schedule")) counts.behind++;
    else if (flags.has("stale")) counts.stale++;
    else if (flags.has("unassigned_approaching")) counts.unassigned++;
    else if (flags.has("stalled")) counts.stalled++;
  }

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase flex items-center gap-2">
          At-Risk Tasks
          {tasks.length > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 rounded-full bg-red-500/20 text-red-400 text-xs font-bold px-1">
              {tasks.length}
            </span>
          )}
        </CardTitle>
        {tasks.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <SummaryPill count={counts.blocked} label="blocked" className="bg-red-500/15 text-red-400" />
            <SummaryPill count={counts.overdue} label="overdue" className="bg-orange-500/15 text-orange-400" />
            <SummaryPill count={counts.behind} label="behind" className="bg-red-500/15 text-red-300" />
            <SummaryPill count={counts.stale} label="stale" className="bg-amber-500/15 text-amber-400" />
            <SummaryPill count={counts.unassigned} label="unassigned" className="bg-amber-500/15 text-amber-300" />
            <SummaryPill count={counts.stalled} label="stalled" className="bg-yellow-500/15 text-yellow-400" />
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <span className="text-green-400 text-base">✓</span>
            </div>
            <p className="text-sm text-muted-foreground">No at-risk tasks</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((task) => {
              const dueDateInfo = getDueDateInfo(task.dueDate);
              const riskLabels = (task.riskFlags ?? []).map((f) => f.label);
              return (
                <li
                  key={task.id}
                  className="flex items-start gap-2.5 rounded-lg border border-border bg-accent/30 px-3 py-2.5 hover:bg-accent/60 transition-colors"
                >
                  <RiskIcon task={task} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="text-sm font-medium text-foreground hover:text-foreground hover:underline truncate max-w-xs"
                      >
                        {task.title}
                      </Link>
                      <StatusBadge status={task.status} className="shrink-0 text-xs" />
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.assignedTo ? (
                        <span className="text-xs text-muted-foreground">
                          {task.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 font-medium">
                          Unassigned
                        </span>
                      )}
                      {dueDateInfo && (
                        <span className={`text-xs font-medium ${dueDateInfo.className}`}>
                          {dueDateInfo.label}
                        </span>
                      )}
                      {riskLabels.map((label) => (
                        <span key={label} className="text-[10px] text-muted-foreground bg-muted rounded px-1 py-0.5">
                          {label}
                        </span>
                      ))}
                      {task.percentComplete !== undefined && task.percentComplete > 0 && (
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {task.percentComplete}% done
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
