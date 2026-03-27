"use client";

import { cn } from "@/lib/utils";
import { BUCKET_COLORS, type BucketColorKey } from "@/lib/bucket-colors";

interface Bucket {
  id: string;
  name: string;
  colorKey: string;
}

interface BucketFilterBarProps {
  buckets: Bucket[];
  selected: string | null;
  onSelect: (bucketId: string | null) => void;
  uncategorizedCount: number;
}

export function BucketFilterBar({
  buckets,
  selected,
  onSelect,
  uncategorizedCount,
}: BucketFilterBarProps) {
  if (buckets.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <button
        onClick={() => onSelect(null)}
        className={cn(
          "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border",
          selected === null
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80"
        )}
      >
        All
      </button>

      {uncategorizedCount > 0 && (
        <button
          onClick={() => onSelect("uncategorized")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1.5",
            selected === "uncategorized"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80"
          )}
        >
          <span className="size-2 rounded-full bg-gray-400 shrink-0" />
          Uncategorized
        </button>
      )}

      {buckets.map((bucket) => {
        const color = BUCKET_COLORS[bucket.colorKey as BucketColorKey];
        return (
          <button
            key={bucket.id}
            onClick={() => onSelect(bucket.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border flex items-center gap-1.5",
              selected === bucket.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-border/80"
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                selected === bucket.id ? "bg-current" : (color?.dotColor ?? "bg-gray-400")
              )}
            />
            {bucket.name}
          </button>
        );
      })}
    </div>
  );
}
