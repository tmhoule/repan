"use client";

import { toast } from "sonner";

export function showBadgeToast(name: string, description: string, icon: string) {
  toast(name, {
    description,
    duration: 5000,
    icon: (
      <span className="text-xl leading-none" role="img" aria-label={name}>
        {icon}
      </span>
    ),
    classNames: {
      toast:
        "!border-amber-200 !bg-amber-50 dark:!border-amber-800 dark:!bg-amber-950/60",
      title: "!text-amber-900 dark:!text-amber-100 !font-semibold",
      description: "!text-amber-700 dark:!text-amber-300",
      icon: "!text-amber-600",
    },
  });
}
