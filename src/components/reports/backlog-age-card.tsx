"use client";

import { Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BacklogAgeData {
  count: number;
  avgDays: number | null;
  maxDays: number | null;
  over7: number;
  over30: number;
}

export function BacklogAgeCard({ data }: { data: BacklogAgeData | undefined }) {
  if (!data || data.count === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xs font-semibold text-muted-foreground tracking-wide uppercase flex items-center gap-2">
          <Inbox className="size-3.5 text-blue-400" />
          Backlog Age
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {data.avgDays !== null && (
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">{data.avgDays}d</p>
              <p className="text-xs text-muted-foreground">avg time in backlog</p>
            </div>
          )}
          {data.maxDays !== null && (
            <div>
              <p className={`text-2xl font-bold tabular-nums ${data.maxDays > 30 ? "text-red-400" : data.maxDays > 14 ? "text-amber-400" : "text-foreground"}`}>
                {data.maxDays}d
              </p>
              <p className="text-xs text-muted-foreground">oldest item</p>
            </div>
          )}
          {data.over7 > 0 && (
            <div>
              <p className="text-2xl font-bold text-amber-400 tabular-nums">{data.over7}</p>
              <p className="text-xs text-muted-foreground">older than 7 days</p>
            </div>
          )}
          {data.over30 > 0 && (
            <div>
              <p className="text-2xl font-bold text-red-400 tabular-nums">{data.over30}</p>
              <p className="text-xs text-muted-foreground">older than 30 days</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
