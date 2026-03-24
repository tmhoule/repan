"use client";

import Link from "next/link";
import { AlertTriangle, Clock, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/tasks/status-badge";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "done";
type TaskPriority = "high" | "medium" | "low";

interface AtRiskTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  assignedTo?: { id: string; name: string } | null;
}

interface AtRiskListProps {
  tasks: AtRiskTask[];
}

function severityScore(task: AtRiskTask): number {
  // blocked > overdue > stalled, high priority first
  const priorityScore = task.priority === "high" ? 100 : task.priority === "medium" ? 50 : 10;
  if (task.status === "blocked") return 300 + priorityScore;
  if (task.dueDate && new Date(task.dueDate) < new Date()) return 200 + priorityScore;
  return 100 + priorityScore;
}

function getDaysOverdue(dueDate: string | null | undefined): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  if (due >= now) return null;
  return Math.floor((now.getTime() - due.getTime()) / 86400000);
}

function RiskIcon({ task }: { task: AtRiskTask }) {
  if (task.status === "blocked")
    return <Ban className="h-3.5 w-3.5 text-red-400 shrink-0" />;
  if (task.dueDate && new Date(task.dueDate) < new Date())
    return <Clock className="h-3.5 w-3.5 text-orange-400 shrink-0" />;
  return <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />;
}

export function AtRiskList({ tasks }: AtRiskListProps) {
  const sorted = [...tasks].sort((a, b) => severityScore(b) - severityScore(a));

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
              const daysOverdue = getDaysOverdue(task.dueDate);
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
                      {task.assignedTo && (
                        <span className="text-xs text-muted-foreground">
                          {task.assignedTo.name}
                        </span>
                      )}
                      {daysOverdue !== null && (
                        <span className="text-xs text-orange-400 font-medium">
                          {daysOverdue}d overdue
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
