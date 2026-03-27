"use client";

import useSWR from "swr";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BUCKET_COLORS, type BucketColorKey } from "@/lib/bucket-colors";

interface Bucket {
  id: string;
  name: string;
  colorKey: string;
}

interface BucketSelectProps {
  teamId: string;
  value: string | null;
  onChange: (bucketId: string | null) => void;
}

const NONE_VALUE = "__none__";

export function BucketSelect({ teamId, value, onChange }: BucketSelectProps) {
  const { data } = useSWR<{ buckets: Bucket[] }>(
    teamId ? `/api/teams/${teamId}/buckets` : null
  );
  const buckets = data?.buckets ?? [];

  if (buckets.length === 0) return null;

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(v) => onChange(v === NONE_VALUE ? null : v)}
    >
      <SelectTrigger>
        <SelectValue>
          {value
            ? buckets.find((b) => b.id === value)?.name ?? "Loading..."
            : "No bucket"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>No bucket</SelectItem>
        {buckets.map((bucket) => {
          const color = BUCKET_COLORS[bucket.colorKey as BucketColorKey];
          return (
            <SelectItem key={bucket.id} value={bucket.id}>
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-2 rounded-full shrink-0",
                    color?.dotColor ?? "bg-gray-400"
                  )}
                />
                {bucket.name}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
