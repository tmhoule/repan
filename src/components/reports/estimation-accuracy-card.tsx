"use client";

import { Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EstimationData {
  small: { avgDays: number | null; count: number };
  medium: { avgDays: number | null; count: number; ratioToSmall: number | null };
  large: { avgDays: number | null; count: number; ratioToSmall: number | null };
}

export function EstimationAccuracyCard({ data }: { data: EstimationData | undefined }) {
  if (!data) return null;
  const hasData = data.small.avgDays !== null || data.medium.avgDays !== null || data.large.avgDays !== null;
  if (!hasData) return null;

  const rows = [
    { label: "Small", ...data.small, ratioToSmall: null as number | null, expected: "baseline" },
    { label: "Medium", ...data.medium, expected: "~3x small" },
    { label: "Large", ...data.large, expected: "~5x small" },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase flex items-center gap-2">
          <Target className="size-3.5" />
          Estimation Accuracy
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground font-medium pb-1 border-b border-border">
            <span>Effort</span>
            <span>Avg Days</span>
            <span>Actual Ratio</span>
            <span>Expected</span>
          </div>
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-4 gap-2 text-xs">
              <span className="text-foreground font-medium">{row.label}</span>
              <span className="text-foreground tabular-nums">
                {row.avgDays !== null ? `${row.avgDays}d` : "\u2014"}
                {row.count > 0 && <span className="text-muted-foreground ml-1">({row.count})</span>}
              </span>
              <span className="text-foreground tabular-nums">
                {row.ratioToSmall !== null ? `${row.ratioToSmall}x` : "\u2014"}
              </span>
              <span className="text-muted-foreground">{row.expected}</span>
            </div>
          ))}
        </div>
        {data.small.count >= 3 && (
          <p className="text-[11px] text-muted-foreground mt-3">
            If ratios diverge significantly from expected, effort estimates may need recalibration.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
