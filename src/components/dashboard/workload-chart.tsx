"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkloadUser {
  user: { id: string; name: string; avatarColor: string };
  taskCount: number;
  byPriority: { high: number; medium: number; low: number };
  tasks?: Array<{ title: string; priority: string }>;
  boulders?: Array<{ title: string; timeAllocation: number }>;
  boulderAllocation?: number;
  avg30d?: number;
}

interface WorkloadChartProps {
  data: WorkloadUser[];
}

const TIME_WEIGHTS: Record<string, number> = { high: 60, medium: 35, low: 10 };
const PRIORITY_COLORS: Record<string, string> = { high: "#dc2626", medium: "#f59e0b", low: "#166534" };
const PRIORITY_ORDER = ["high", "medium", "low"] as const;

const SEGMENTS = [
  { key: "boulder", label: "Boulder", color: "#8B5CF6" },
  { key: "high", label: "High (60%)", color: "#dc2626" },
  { key: "medium", label: "Med (35%)", color: "#f59e0b" },
  { key: "low", label: "Low (10%)", color: "#166534" },
] as const;

function WorkloadTooltip({
  user,
  tasks,
  boulders,
  total,
  avg30d,
}: {
  user: string;
  tasks: Array<{ title: string; priority: string }>;
  boulders: Array<{ title: string; timeAllocation: number }>;
  total: number;
  avg30d: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs max-w-[300px]">
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-semibold">{user}</p>
        <span className={`font-bold tabular-nums ${total > 100 ? "text-red-400" : "text-foreground"}`}>
          {total}%
        </span>
      </div>

      {tasks.length > 0 && (
        <>
          {PRIORITY_ORDER.map((priority) => {
            const priorityTasks = tasks.filter((t) => t.priority === priority);
            if (priorityTasks.length === 0) return null;
            return priorityTasks.map((t) => (
              <div key={t.title} className="flex items-start gap-2 mb-0.5">
                <span
                  className="inline-block h-2 w-2 rounded-sm mt-0.5 shrink-0"
                  style={{ backgroundColor: PRIORITY_COLORS[priority] }}
                />
                <span className="text-foreground line-clamp-1 flex-1">{t.title}</span>
                <span className="text-muted-foreground shrink-0">{TIME_WEIGHTS[priority]}%</span>
              </div>
            ));
          })}
        </>
      )}

      {boulders.length > 0 && (
        <div className={tasks.length > 0 ? "border-t border-border mt-1.5 pt-1.5" : ""}>
          {boulders.map((b) => (
            <div key={b.title} className="flex items-start gap-2 mb-0.5">
              <span className="inline-block h-2 w-2 rounded-sm mt-0.5 shrink-0" style={{ backgroundColor: "#8B5CF6" }} />
              <span className="text-foreground line-clamp-1 flex-1">{b.title}</span>
              <span className="text-purple-400 shrink-0">{b.timeAllocation}%</span>
            </div>
          ))}
        </div>
      )}

      {tasks.length === 0 && boulders.length === 0 && (
        <p className="text-muted-foreground">No active work</p>
      )}

      <div className="border-t border-border mt-1.5 pt-1 flex justify-between gap-4">
        <span className="text-muted-foreground">30-day avg</span>
        <span className="font-medium tabular-nums">{avg30d}%</span>
      </div>
    </div>
  );
}

function WorkloadRow({
  user,
  segments,
  total,
  avg30d,
  maxValue,
  tasks,
  boulders,
  isFirst,
}: {
  user: WorkloadUser["user"];
  segments: Array<{ color: string; value: number }>;
  total: number;
  avg30d: number;
  maxValue: number;
  tasks: Array<{ title: string; priority: string }>;
  boulders: Array<{ title: string; timeAllocation: number }>;
  isFirst: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const scale = (v: number) => `${(v / maxValue) * 100}%`;

  const diff = total - avg30d;
  const avgColor = diff > 20 ? "#f59e0b" : diff < -20 ? "#10B981" : "rgba(255,255,255,0.3)";

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground w-16 truncate shrink-0">
          {user.name.split(" ")[0]}
        </span>
        <div className="flex-1 space-y-0.5">
          {/* Main workload bar */}
          <div className="relative h-5 rounded bg-muted/30 overflow-hidden">
            {/* 100% capacity line */}
            <div
              className="absolute top-0 bottom-0 w-px z-10"
              style={{ left: scale(100), backgroundColor: "rgba(255,255,255,0.2)" }}
            />
            {/* Stacked segments */}
            <div className="absolute inset-0 flex">
              {segments.map((seg, i) => (
                seg.value > 0 && (
                  <div
                    key={i}
                    className="h-full"
                    style={{
                      width: scale(seg.value),
                      backgroundColor: seg.color,
                      borderRadius: i === segments.length - 1 || segments.slice(i + 1).every(s => s.value === 0)
                        ? "0 3px 3px 0" : undefined,
                    }}
                  />
                )
              ))}
            </div>
          </div>
          {/* 30-day average thin bar */}
          <div className="relative h-1.5 rounded-full bg-transparent overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: scale(avg30d), backgroundColor: avgColor }}
            />
          </div>
        </div>
        <span className={`text-xs font-semibold tabular-nums w-10 text-right shrink-0 ${total > 100 ? "text-red-400" : "text-muted-foreground"}`}>
          {total}%
        </span>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div className={`absolute left-16 z-50 ${isFirst ? "top-full mt-1" : "bottom-full mb-2"}`}>
          <WorkloadTooltip
            user={user.name.split(" ")[0]}
            tasks={tasks}
            boulders={boulders}
            total={total}
            avg30d={avg30d}
          />
        </div>
      )}
    </div>
  );
}

export function WorkloadChart({ data }: WorkloadChartProps) {
  const rows = data.map((d) => {
    const highPct = d.byPriority.high * TIME_WEIGHTS.high;
    const medPct = d.byPriority.medium * TIME_WEIGHTS.medium;
    const lowPct = d.byPriority.low * TIME_WEIGHTS.low;
    const boulderPct = d.boulderAllocation ?? 0;
    const total = boulderPct + highPct + medPct + lowPct;
    return {
      user: d.user,
      segments: [
        { color: "#8B5CF6", value: boulderPct },
        { color: "#dc2626", value: highPct },
        { color: "#f59e0b", value: medPct },
        { color: "#166534", value: lowPct },
      ],
      total,
      avg30d: d.avg30d ?? 0,
      tasks: d.tasks ?? [],
      boulders: d.boulders ?? [],
    };
  });

  const maxValue = Math.max(100, ...rows.map((r) => Math.max(r.total, r.avg30d)));

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Staff Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No active work
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((row, i) => (
              <WorkloadRow key={row.user.id} maxValue={maxValue} isFirst={i === 0} {...row} />
            ))}

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-zinc-500 flex-wrap">
              {SEGMENTS.map((s) => (
                <span key={s.key} className="flex items-center gap-1.5">
                  <span className="inline-block size-2 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
              ))}
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-4 h-1 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.3)" }} />
                30d avg
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
