"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "not_started" | "in_progress" | "blocked" | "stalled" | "done" | "boulder";

const statusConfig: Record<Status, { label: string; className: string }> = {
  not_started: {
    label: "Not Started",
    className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  },
  in_progress: {
    label: "In Progress",
    className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800",
  },
  blocked: {
    label: "Blocked",
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800",
  },
  stalled: {
    label: "Stalled",
    className: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
  },
  done: {
    label: "Done",
    className: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800",
  },
  boulder: {
    label: "Boulder",
    className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800",
  },
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <Badge
      variant="outline"
      className={cn(config.className, "border font-medium", className)}
    >
      {config.label}
    </Badge>
  );
}
