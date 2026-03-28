"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkloadUser {
  user: { id: string; name: string; avatarColor: string };
  taskCount: number;
  byPriority: { high: number; medium: number; low: number };
  tasks?: Array<{ title: string; priority: string }>;
  boulders?: Array<{ title: string; timeAllocation: number }>;
  boulderAllocation?: number;
}

interface WorkloadChartProps {
  data: WorkloadUser[];
}

const PRIORITY_COLORS: Record<string, string> = { high: "#dc2626", medium: "#f59e0b", low: "#166534" };
const PRIORITY_ORDER = ["high", "medium", "low"] as const;

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string; payload?: any }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const tasks: Array<{ title: string; priority: string }> = row?._tasks ?? [];
  const boulders: Array<{ title: string; timeAllocation: number }> = row?._boulders ?? [];

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs max-w-[280px]">
      <p className="font-semibold mb-1.5">{label}</p>

      {tasks.length > 0 ? (
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
                <span className="text-foreground line-clamp-1">{t.title}</span>
              </div>
            ));
          })}
          <div className="border-t border-border mt-1.5 pt-1 flex justify-between gap-4">
            <span className="text-muted-foreground">Total tasks</span>
            <span className="font-semibold">{tasks.length}</span>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">No active tasks</p>
      )}

    </div>
  );
};

function BoulderRow({
  user,
  boulders,
  allocation,
}: {
  user: { id: string; name: string };
  boulders: Array<{ title: string; timeAllocation: number }>;
  allocation: number;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex items-center gap-3"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="text-xs text-muted-foreground w-16 truncate">{user.name.split(" ")[0]}</span>
      <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-purple-500" style={{ width: `${allocation}%` }} />
      </div>
      <span className="text-xs font-semibold text-purple-400 tabular-nums w-10 text-right">{allocation}%</span>

      {hovered && boulders.length > 0 && (
        <div className="absolute bottom-full left-16 mb-2 z-50 rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs max-w-[260px]">
          <p className="font-semibold mb-1.5">{user.name.split(" ")[0]}&apos;s Boulders</p>
          {boulders.map((b) => (
            <div key={b.title} className="flex items-start gap-2 mb-0.5">
              <span className="inline-block h-2 w-2 rounded-sm mt-0.5 shrink-0" style={{ backgroundColor: "#8B5CF6" }} />
              <span className="text-foreground line-clamp-1 flex-1">{b.title}</span>
              <span className="text-purple-400 shrink-0">{b.timeAllocation}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkloadChart({ data }: WorkloadChartProps) {
  const chartData = data.map((d) => ({
    name: d.user.name.split(" ")[0],
    High: d.byPriority.high * 2.5,
    Medium: d.byPriority.medium * 1.5,
    Low: d.byPriority.low * 0.5,
    boulderAllocation: d.boulderAllocation ?? 0,
    _tasks: d.tasks ?? [],
    _boulders: d.boulders ?? [],
  }));

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Task Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No active tasks
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.07)"
              />
              <XAxis
                type="number"
                tick={false}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Legend
                content={() => (
                  <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-zinc-500">
                    {[
                      { label: "High", color: "#dc2626" },
                      { label: "Medium", color: "#f59e0b" },
                      { label: "Low", color: "#166534" },
                    ].map((item) => (
                      <span key={item.label} className="flex items-center gap-1.5">
                        <span className="inline-block size-2 rounded-sm" style={{ backgroundColor: item.color }} />
                        {item.label}
                      </span>
                    ))}
                  </div>
                )}
              />
              <Bar dataKey="High" stackId="a" fill="#dc2626" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Medium" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Low" stackId="a" fill="#166534" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}

        {/* Boulder utilization */}
        {data.some((d) => (d.boulderAllocation ?? 0) > 0) && (
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              🪨 Boulder Utilization
            </p>
            <div className="space-y-2">
              {data.filter((d) => (d.boulderAllocation ?? 0) > 0).map((d) => (
                <BoulderRow key={d.user.id} user={d.user} boulders={d.boulders ?? []} allocation={d.boulderAllocation ?? 0} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
