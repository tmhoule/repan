"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkloadUser {
  user: { id: string; name: string; avatarColor: string };
  taskCount: number;
  wipCount?: number;
  byPriority: { high: number; medium: number; low: number };
  tasks?: Array<{ title: string; priority: string }>;
  boulders?: Array<{ title: string; timeAllocation: number }>;
  boulderAllocation?: number;
  avg30d?: number;
}

interface WorkloadChartProps {
  data: WorkloadUser[];
  priorityWeights?: { high: number; medium: number; low: number };
}

const PRIORITY_COLORS: Record<string, string> = { high: "#dc2626", medium: "#f59e0b", low: "#166534" };
const PRIORITY_ORDER = ["high", "medium", "low"] as const;

function WorkloadTooltip({
  user,
  tasks,
  boulders,
  total,
  avg30d,
  wipCount,
  weights,
}: {
  user: string;
  tasks: Array<{ title: string; priority: string }>;
  boulders: Array<{ title: string; timeAllocation: number }>;
  total: number;
  avg30d: number;
  wipCount: number;
  weights: Record<string, number>;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs max-w-[300px]">
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-semibold">{user}</p>
        <div className="flex items-center gap-2">
          {wipCount > 0 && (
            <span className={`tabular-nums ${wipCount >= 5 ? "text-amber-400 font-bold" : "text-muted-foreground"}`}>
              {wipCount} WIP
            </span>
          )}
          <span className={`font-bold tabular-nums ${total > 100 ? "text-red-400" : "text-foreground"}`}>
            {total}%
          </span>
        </div>
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
                <span className="text-muted-foreground shrink-0">{weights[priority]}%</span>
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
  wipCount,
  maxValue,
  tasks,
  boulders,
  weights,
}: {
  user: WorkloadUser["user"];
  segments: Array<{ color: string; value: number }>;
  total: number;
  avg30d: number;
  wipCount: number;
  maxValue: number;
  tasks: Array<{ title: string; priority: string }>;
  boulders: Array<{ title: string; timeAllocation: number }>;
  weights: Record<string, number>;
}) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const scale = (v: number) => `${(v / maxValue) * 100}%`;

  const diff = total - avg30d;
  const avgColor = diff > 20 ? "#f59e0b" : diff < -20 ? "#10B981" : "rgba(255,255,255,0.3)";

  const updatePosition = useCallback(() => {
    if (!rowRef.current) return;
    const rect = rowRef.current.getBoundingClientRect();
    // Start: position to the right of the name column, vertically centered on the row
    let top = rect.top + rect.height / 2;
    let left = rect.left + 64; // 64px = w-16 (name column width)

    // Adjust after tooltip renders to keep it on-screen
    if (tooltipRef.current) {
      const tt = tooltipRef.current.getBoundingClientRect();
      // Vertical: prefer centered, but clamp to viewport
      top = top - tt.height / 2;
      if (top < 8) top = 8;
      if (top + tt.height > window.innerHeight - 8) top = window.innerHeight - 8 - tt.height;
      // Horizontal: keep on-screen
      if (left + tt.width > window.innerWidth - 8) left = rect.left - tt.width - 8;
    }

    setTooltipPos({ top, left });
  }, []);

  useEffect(() => {
    if (hovered) updatePosition();
  }, [hovered, updatePosition]);

  // Reposition after first render so we have tooltip dimensions
  useEffect(() => {
    if (hovered && tooltipRef.current) updatePosition();
  });

  return (
    <div
      ref={rowRef}
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTooltipPos(null); }}
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

      {/* Tooltip — rendered via portal to escape overflow-hidden */}
      {hovered && createPortal(
        <div
          ref={tooltipRef}
          className="fixed z-50 pointer-events-none"
          style={tooltipPos ? { top: tooltipPos.top, left: tooltipPos.left } : { visibility: "hidden" }}
        >
          <WorkloadTooltip
            user={user.name.split(" ")[0]}
            tasks={tasks}
            boulders={boulders}
            total={total}
            avg30d={avg30d}
            wipCount={wipCount}
            weights={weights}
          />
        </div>,
        document.body
      )}
    </div>
  );
}

export function WorkloadChart({ data, priorityWeights }: WorkloadChartProps) {
  const TIME_WEIGHTS = priorityWeights ?? { high: 60, medium: 35, low: 10 };
  const SEGMENTS = [
    { key: "boulder", label: "Boulder", color: "#8B5CF6" },
    { key: "high", label: `High (${TIME_WEIGHTS.high}%)`, color: "#dc2626" },
    { key: "medium", label: `Med (${TIME_WEIGHTS.medium}%)`, color: "#f59e0b" },
    { key: "low", label: `Low (${TIME_WEIGHTS.low}%)`, color: "#166534" },
  ] as const;

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
      wipCount: d.wipCount ?? 0,
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
            {rows.map((row) => (
              <WorkloadRow key={row.user.id} maxValue={maxValue} weights={TIME_WEIGHTS} {...row} />
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
