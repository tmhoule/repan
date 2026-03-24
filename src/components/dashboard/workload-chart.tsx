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
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-semibold mb-1.5">{label}</p>
      {payload.map((p) => (
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
        <span className="text-muted-foreground">Total</span>
        <span className="font-semibold">{total}</span>
      </div>
    </div>
  );
};

export function WorkloadChart({ data }: WorkloadChartProps) {
  const chartData = data.map((d) => ({
    name: d.user.name.split(" ")[0],
    High: d.byPriority.high,
    Medium: d.byPriority.medium,
    Low: d.byPriority.low,
  }));

  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-zinc-100 tracking-wide uppercase">
          Team Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        {data.length === 0 ? (
          <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
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
              />
              <Bar dataKey="High" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Medium" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
              <Bar dataKey="Low" stackId="a" fill="#22c55e" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
