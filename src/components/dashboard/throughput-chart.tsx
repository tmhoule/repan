"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WeeklyDataPoint {
  week: string;
  points: number;
}

interface ThroughputChartProps {
  data: WeeklyDataPoint[];
}

function formatWeekLabel(dateStr: string): string {
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
      <p className="font-semibold text-foreground">
        {payload[0].value}{" "}
        <span className="font-normal text-muted-foreground">pts completed</span>
      </p>
    </div>
  );
};

export function ThroughputChart({ data }: ThroughputChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    week: formatWeekLabel(d.week),
  }));

  const maxPoints = Math.max(...data.map((d) => d.points), 1);

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Weekly Throughput
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-2">
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              domain={[0, Math.ceil(maxPoints * 1.15)]}
              tick={{ fontSize: 11, fill: "#71717a" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="points"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#throughputGradient)"
              dot={{ fill: "#6366f1", strokeWidth: 0, r: 3 }}
              activeDot={{ fill: "#818cf8", strokeWidth: 0, r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
