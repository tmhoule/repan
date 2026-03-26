"use client";

import Link from "next/link";
import { CheckCircle, AlertTriangle, TrendingDown, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrackingStatus = "on_track" | "behind" | "at_risk" | "blocked";

interface RiskFlag {
  riskType: string;
  label: string;
}

interface KeyProject {
  id: string;
  title: string;
  status: string;
  percentComplete: number;
  dueDate?: string | null;
  assignedTo?: { id: string; name: string } | null;
  tracking: TrackingStatus;
  riskFlags?: RiskFlag[];
}

interface KeyProjectsProps {
  projects: KeyProject[];
}

const TRACKING_CONFIG: Record<TrackingStatus, { label: string; icon: React.ReactNode; className: string; barColor: string }> = {
  on_track: {
    label: "On Track",
    icon: <CheckCircle className="size-3.5" />,
    className: "text-emerald-400 bg-emerald-500/15",
    barColor: "bg-emerald-500",
  },
  at_risk: {
    label: "At Risk",
    icon: <AlertTriangle className="size-3.5" />,
    className: "text-amber-400 bg-amber-500/15",
    barColor: "bg-amber-500",
  },
  behind: {
    label: "Behind",
    icon: <TrendingDown className="size-3.5" />,
    className: "text-red-400 bg-red-500/15",
    barColor: "bg-red-500",
  },
  blocked: {
    label: "Blocked",
    icon: <Ban className="size-3.5" />,
    className: "text-red-400 bg-red-500/15",
    barColor: "bg-red-500",
  },
};

function formatDueDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays <= 7) return `Due in ${diffDays}d`;
  return `Due ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

// Sort: blocked first, then behind, at_risk, on_track
const TRACKING_ORDER: Record<TrackingStatus, number> = { blocked: 0, behind: 1, at_risk: 2, on_track: 3 };

export function KeyProjects({ projects }: KeyProjectsProps) {
  const sorted = [...projects].sort((a, b) => TRACKING_ORDER[a.tracking] - TRACKING_ORDER[b.tracking]);

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Key Projects
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <p className="text-sm text-muted-foreground">No high-priority tasks</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((project) => {
              const config = TRACKING_CONFIG[project.tracking];
              const dueLabel = formatDueDate(project.dueDate);
              return (
                <div
                  key={project.id}
                  className="rounded-lg border border-border bg-accent/20 px-3 py-2.5 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/tasks/${project.id}`}
                      className="text-sm font-medium text-foreground hover:underline line-clamp-1 flex-1 min-w-0"
                    >
                      {project.title}
                    </Link>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${config.className}`}>
                      {config.icon}
                      {config.label}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${config.barColor}`}
                        style={{ width: `${project.percentComplete}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                      {project.percentComplete}%
                    </span>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {project.assignedTo && <span>{project.assignedTo.name}</span>}
                    {!project.assignedTo && <span className="text-amber-400">Unassigned</span>}
                    {dueLabel && <span>{dueLabel}</span>}
                    {(project.riskFlags ?? []).filter((f) => f.riskType !== "behind_schedule" || project.tracking !== "behind").map((f) => (
                      <span key={f.riskType} className="text-muted-foreground/70">{f.label}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
