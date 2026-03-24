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
        "flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold text-orange-400",
        "bg-gradient-to-r from-orange-500/10 to-red-500/10",
        "shadow-[0_0_8px_rgba(249,115,22,0.2)]",
        className
      )}
      title={label ? `${label}: ${count} day streak` : `${count} day streak`}
    >
      <span
        role="img"
        aria-label="fire"
        className="text-base leading-none"
        style={{
          display: "inline-block",
          animation: "wiggle 1.4s ease-in-out infinite",
        }}
      >
        🔥
      </span>
      <span className="tabular-nums">{count}</span>
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
      `}</style>
    </div>
  );
}
