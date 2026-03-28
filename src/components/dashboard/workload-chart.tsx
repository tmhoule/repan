"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
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

const TIME_WEIGHTS: Record<string, number> = { high: 60, medium: 35, low: 10 };
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
  const total: number = row?._total ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs max-w-[300px]">
      <div className="flex items-center justify-between mb-1.5">
        <p className="font-semibold">{label}</p>
        <span className={`font-bold tabular-nums ${total > 100 ? "text-red-400" : "text-foreground"}`}>
          {total}%
        </span>
      </div>

      {/* Tasks by priority */}
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

      {/* Boulders */}
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
    </div>
  );
};

export function WorkloadChart({ data }: WorkloadChartProps) {
  const chartData = data.map((d) => {
    const highPct = d.byPriority.high * TIME_WEIGHTS.high;
    const medPct = d.byPriority.medium * TIME_WEIGHTS.medium;
    const lowPct = d.byPriority.low * TIME_WEIGHTS.low;
    const boulderPct = d.boulderAllocation ?? 0;
    return {
      name: d.user.name.split(" ")[0],
      High: highPct,
      Medium: medPct,
      Low: lowPct,
      Boulder: boulderPct,
      _tasks: d.tasks ?? [],
      _boulders: d.boulders ?? [],
      _total: highPct + medPct + lowPct + boulderPct,
    };
  });

  const maxValue = Math.max(100, ...chartData.map((d) => d._total));

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Staff Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            No active work
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(160, data.length * 44)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
              barCategoryGap="30%"
            >
              <CartesianGrid
                horizontal={false}
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.07)"
              />
              <XAxis
                type="number"
                domain={[0, maxValue]}
                tick={{ fontSize: 11, fill: "#71717a" }}
                tickFormatter={(v) => `${v}%`}
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
              <ReferenceLine x={100} stroke="rgba(255,255,255,0.25)" strokeDasharray="4 4" />
              <Legend
                content={() => (
                  <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-zinc-500">
                    {[
                      { label: "High (60%)", color: "#dc2626" },
                      { label: "Med (35%)", color: "#f59e0b" },
                      { label: "Low (10%)", color: "#166534" },
                      { label: "Boulder", color: "#8B5CF6" },
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
              <Bar dataKey="Low" stackId="a" fill="#166534" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Boulder" stackId="a" fill="#8B5CF6" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
