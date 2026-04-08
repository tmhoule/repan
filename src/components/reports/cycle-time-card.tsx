"use client";

import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CycleTimeData {
  [effort: string]: { avg: number | null; count: number };
}

const EFFORT_LABELS: Record<string, string> = { small: "Small", medium: "Medium", large: "Large" };
const EFFORT_COLORS: Record<string, string> = { small: "bg-teal-500", medium: "bg-violet-500", large: "bg-orange-500" };

export function CycleTimeCard({ data }: { data: CycleTimeData | undefined }) {
  if (!data) return null;

  const efforts = ["small", "medium", "large"];
  const maxAvg = Math.max(...efforts.map((e) => data[e]?.avg ?? 0), 1);
  const hasData = efforts.some((e) => data[e]?.avg !== null);

  if (!hasData) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase flex items-center gap-2">
          <Clock className="size-3.5" />
          Cycle Time (start to done)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {efforts.map((effort) => {
            const entry = data[effort];
            if (!entry || entry.avg === null) return null;
            return (
              <div key={effort} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{EFFORT_LABELS[effort]}</span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {entry.avg} day{entry.avg !== 1 ? "s" : ""}
                    <span className="text-muted-foreground font-normal ml-1">({entry.count} tasks)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${EFFORT_COLORS[effort]}`}
                    style={{ width: `${(entry.avg / maxAvg) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
