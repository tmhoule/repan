"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ThroughputDataPoint {
  week: string;
  points: number;
}

interface ThroughputTrendProps {
  data: ThroughputDataPoint[];
  period: "weekly" | "monthly";
}

function formatLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="text-muted-foreground mb-1">Week of {label}</p>
      <p className="font-semibold text-zinc-100">
        {payload[0].value}{" "}
        <span className="font-normal text-zinc-400">pts completed</span>
      </p>
    </div>
  );
};

export function ThroughputTrend({ data, period }: ThroughputTrendProps) {
  const chartData = data.map((d) => ({
    ...d,
    week: formatLabel(d.week),
  }));

  const avg =
    data.length > 0
      ? Math.round(data.reduce((s, d) => s + d.points, 0) / data.length)
      : 0;

  const maxPoints = Math.max(...data.map((d) => d.points), 1);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-100 tracking-wide uppercase">
            Throughput Trend
          </CardTitle>
          <span className="text-xs text-zinc-500">
            {period === "monthly" ? "Last 30 days" : "Last 7 days"} &middot; avg{" "}
            <span className="text-zinc-300 font-semibold">{avg} pts/wk</span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              vertical={false}
            />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11, fill: "#71717a" }}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              domain={[0, Math.ceil(maxPoints * 1.2)]}
              tick={{ fontSize: 11, fill: "#71717a" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
            />
            {avg > 0 && (
              <ReferenceLine
                y={avg}
                stroke="#6366f1"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
              />
            )}
            <Line
              type="monotone"
              dataKey="points"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={{ fill: "#6366f1", strokeWidth: 0, r: 3.5 }}
              activeDot={{ fill: "#818cf8", strokeWidth: 0, r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
