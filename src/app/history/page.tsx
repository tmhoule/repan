"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { History, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { BucketBadge } from "@/components/buckets/bucket-badge";

type TaskPriority = "high" | "medium" | "low";

interface HistoryTask {
  id: string;
  title: string;
  priority: TaskPriority;
  effortEstimate: string;
  completedAt: string;
  startedAt: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string; avatarColor: string } | null;
  bucket: { id: string; name: string; colorKey: string } | null;
}

interface Bucket {
  id: string;
  name: string;
  colorKey: string;
}

interface TeamMember {
  id: string;
  name: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function cycleDays(task: HistoryTask): string | null {
  if (!task.startedAt || !task.completedAt) return null;
  const days = Math.round((new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 86400000 * 10) / 10;
  return `${days}d`;
}

export default function HistoryPage() {
  const [assignedTo, setAssignedTo] = useState("");
  const [bucketId, setBucketId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const params = new URLSearchParams();
  if (assignedTo) params.set("assignedTo", assignedTo);
  if (bucketId) params.set("bucketId", bucketId);
  if (fromDate) params.set("from", fromDate);
  if (toDate) params.set("to", toDate);
  const queryString = params.toString();

  const { data, isLoading, mutate } = useSWR<{ tasks: HistoryTask[] }>(
    `/api/history${queryString ? `?${queryString}` : ""}`
  );
  const tasks = data?.tasks ?? [];

  const handleReopen = async (taskId: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "not_started" }),
    });
    mutate();
  };

  const { data: bucketsData } = useSWR<{ buckets: Bucket[] }>("/api/buckets");
  const buckets = bucketsData?.buckets ?? [];

  const { data: usersData } = useSWR<TeamMember[]>("/api/users");
  const users = usersData ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Completed Work</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Loading..." : `${tasks.length} completed task${tasks.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40 h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40 h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Person</Label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-40"
              >
                <option value="">All</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Bucket</Label>
              <select
                value={bucketId}
                onChange={(e) => setBucketId(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-40"
              >
                <option value="">All</option>
                <option value="uncategorized">Uncategorized</option>
                {buckets.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <History className="size-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No completed tasks match your filters</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task) => {
            const cycle = cycleDays(task);
            return (
              <div
                key={task.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 hover:bg-accent/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/tasks/${task.id}`}
                    className="text-sm font-medium hover:text-primary hover:underline transition-colors line-clamp-1"
                  >
                    {task.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {task.assignedTo && (
                      <span className="text-xs text-muted-foreground">{task.assignedTo.name}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{formatDate(task.completedAt)}</span>
                    {cycle && (
                      <span className="text-xs text-muted-foreground">cycle: {cycle}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <PriorityBadge priority={task.priority} />
                  {task.bucket && (
                    <BucketBadge name={task.bucket.name} colorKey={task.bucket.colorKey} />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-xs shrink-0"
                    onClick={() => handleReopen(task.id)}
                  >
                    <RotateCcw className="size-3" />
                    Reopen
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
