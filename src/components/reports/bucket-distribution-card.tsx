"use client";

import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUCKET_COLORS, type BucketColorKey } from "@/lib/bucket-colors";

interface BucketItem {
  name: string;
  colorKey: string | null;
  count: number;
}

export function BucketDistributionCard({ data }: { data: BucketItem[] | undefined }) {
  if (!data || data.length === 0) return null;

  const maxCount = Math.max(...data.map((d) => d.count));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-xs font-semibold text-zinc-400 tracking-wide uppercase flex items-center gap-2">
          <BarChart3 className="size-3.5" />
          Work by Bucket
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {data.map((item) => {
            const color = item.colorKey ? BUCKET_COLORS[item.colorKey as BucketColorKey] : null;
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <span
                      className={`size-2 rounded-full shrink-0 ${color?.dotColor ?? "bg-zinc-500"}`}
                    />
                    {item.name}
                  </span>
                  <span className="text-zinc-400 tabular-nums">
                    {item.count} <span className="text-zinc-600">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${color?.dotColor ?? "bg-zinc-500"}`}
                    style={{ width: `${(item.count / maxCount) * 100}%` }}
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
