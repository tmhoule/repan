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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkloadUser {
  user: { id: string; name: string; avatarColor: string };
  taskCount: number;
  byPriority: { high: number; medium: number; low: number };
  boulderAllocation?: number;
}

interface WorkloadChartProps {
  data: WorkloadUser[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey?: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const taskEntries = payload.filter((p) => p.dataKey !== "boulderAllocation");
  const boulderEntry = payload.find((p) => p.dataKey === "boulderAllocation");
  const total = taskEntries.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {taskEntries.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span
            className="inline-block h-2 w-2 rounded-sm"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-medium">{p.value}</span>
        </div>
      ))}
      <div className="border-t border-border mt-1.5 pt-1 flex justify-between gap-4">
        <span className="text-muted-foreground">Total tasks</span>
        <span className="font-semibold">{total}</span>
      </div>
      {boulderEntry && boulderEntry.value > 0 && (
        <div className="border-t border-border mt-1 pt-1 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: "#8B5CF6" }} />
          <span className="text-muted-foreground">Boulder time:</span>
          <span className="font-semibold text-purple-500">{boulderEntry.value}%</span>
        </div>
      )}
    </div>
  );
};

export function WorkloadChart({ data }: WorkloadChartProps) {
  const chartData = data.map((d) => ({
    name: d.user.name.split(" ")[0],
    High: d.byPriority.high,
    Medium: d.byPriority.medium,
    Low: d.byPriority.low,
    boulderAllocation: d.boulderAllocation ?? 0,
  }));

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Team Workload
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
                allowDecimals={false}
                tick={{ fontSize: 11, fill: "#71717a" }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
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
                wrapperStyle={{ fontSize: 11, color: "#71717a", paddingTop: 8 }}
                iconSize={8}
                iconType="square"
                {...{ payload: [
                  { value: "High", type: "square", color: "#dc2626" },
                  { value: "Medium", type: "square", color: "#f59e0b" },
                  { value: "Low", type: "square", color: "#166534" },
                ] } as any}
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
                <div key={d.user.id} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 truncate">{d.user.name.split(" ")[0]}</span>
                  <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-purple-500"
                      style={{ width: `${d.boulderAllocation}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-purple-400 tabular-nums w-10 text-right">
                    {d.boulderAllocation}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
