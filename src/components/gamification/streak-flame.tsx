"use client";

import { cn } from "@/lib/utils";

interface StreakFlameProps {
  count: number;
  label?: string;
  className?: string;
}

export function StreakFlame({ count, label, className }: StreakFlameProps) {
  if (count <= 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-sm font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-400",
        className
      )}
      title={label ? `${label}: ${count} day streak` : `${count} day streak`}
    >
      <span role="img" aria-label="fire" className="text-base leading-none">
        🔥
      </span>
      <span className="tabular-nums">{count}</span>
    </div>
  );
}
