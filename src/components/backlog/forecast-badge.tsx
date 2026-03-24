"use client";

import { Badge } from "@/components/ui/badge";
import { formatForecast } from "@/lib/forecasting";
import { cn } from "@/lib/utils";

interface ForecastBadgeProps {
  weeksToStart: number | null;
  className?: string;
}

export function ForecastBadge({ weeksToStart, className }: ForecastBadgeProps) {
  const label = formatForecast(weeksToStart);
  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700 font-normal text-xs",
        className
      )}
    >
      {label}
    </Badge>
  );
}
