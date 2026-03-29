"use client";

import { Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BlockerStatsData {
  count: number;
  avgDays: number | null;
  maxDays: number | null;
  currentlyBlocked: number;
}

export function BlockerStatsCard({ data }: { data: BlockerStatsData | undefined }) {
  if (!data) return null;
  if (data.count === 0 && data.currentlyBlocked === 0) return null;

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-xs font-semibold text-zinc-400 tracking-wide uppercase flex items-center gap-2">
          <Ban className="size-3.5 text-red-400" />
          Blocker Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-2xl font-bold text-zinc-100 tabular-nums">{data.count}</p>
            <p className="text-xs text-zinc-500">blockers resolved</p>
          </div>
          {data.avgDays !== null && (
            <div>
              <p className="text-2xl font-bold text-zinc-100 tabular-nums">{data.avgDays}d</p>
              <p className="text-xs text-zinc-500">avg resolution time</p>
            </div>
          )}
          {data.maxDays !== null && (
            <div>
              <p className="text-2xl font-bold text-amber-400 tabular-nums">{data.maxDays}d</p>
              <p className="text-xs text-zinc-500">longest blocker</p>
            </div>
          )}
          {data.currentlyBlocked > 0 && (
            <div>
              <p className="text-2xl font-bold text-red-400 tabular-nums">{data.currentlyBlocked}</p>
              <p className="text-xs text-zinc-500">currently blocked</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
