"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ActivityEntry {
  id: string;
  type?: string;
  action?: string;
  timestamp: string;
  user: { name: string; avatarColor: string };
  task: { id: string; title: string };
}

interface ActivityFeedProps {
  entries: ActivityEntry[];
}

function relativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const d = new Date(timestamp);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatAction(action: string): string {
  return action.replace(/_/g, " ").toLowerCase();
}

const PAGE_SIZE = 10;

export function ActivityFeed({ entries }: ActivityFeedProps) {
  const [visible, setVisible] = useState(PAGE_SIZE);

  const shown = entries.slice(0, visible);
  const hasMore = visible < entries.length;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground tracking-wide uppercase">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        {entries.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No recent activity
          </div>
        ) : (
          <>
            <div className="max-h-72 overflow-y-auto pr-1 space-y-0.5 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-border">
              {shown.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-2.5 rounded-lg px-2 py-2 hover:bg-accent/50 transition-colors"
                >
                  {/* Avatar dot */}
                  <span
                    className="mt-0.5 h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold"
                    style={{ backgroundColor: entry.user.avatarColor ?? "#6b7280" }}
                    title={entry.user.name}
                  >
                    {entry.user.name.charAt(0).toUpperCase()}
                  </span>

                  <div className="flex-1 min-w-0 text-sm leading-snug">
                    <span className="font-medium text-foreground">{entry.user.name}</span>
                    <span className="text-muted-foreground"> {formatAction(entry.type || entry.action || "")} </span>
                    <Link
                      href={`/tasks/${entry.task.id}`}
                      className="font-medium text-primary hover:text-primary/80 hover:underline break-words"
                    >
                      {entry.task.title}
                    </Link>
                  </div>

                  <span className="shrink-0 text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                    {relativeTime(entry.timestamp)}
                  </span>
                </div>
              ))}
            </div>

            {hasMore && (
              <div className="mt-3 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                >
                  Load more ({entries.length - visible} remaining)
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
