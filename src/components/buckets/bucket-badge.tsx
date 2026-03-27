"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BUCKET_COLORS, type BucketColorKey } from "@/lib/bucket-colors";

interface BucketBadgeProps {
  name: string;
  colorKey: string;
  className?: string;
}

export function BucketBadge({ name, colorKey, className }: BucketBadgeProps) {
  const color = BUCKET_COLORS[colorKey as BucketColorKey];
  if (!color) return null;

  return (
    <Badge
      variant="outline"
      className={cn("border font-medium gap-1.5", color.className, className)}
    >
      <span className={cn("size-2 rounded-full shrink-0", color.dotColor)} />
      {name}
    </Badge>
  );
}
