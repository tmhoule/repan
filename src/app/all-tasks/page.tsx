"use client";

import Link from "next/link";
import useSWR from "swr";
import { ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { BucketBadge } from "@/components/buckets/bucket-badge";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "paused";

interface Row {
  id: string;
  title: string;
  status: TaskStatus;
  priority: "high" | "medium" | "low";
  dueDate: string | null;
  assignedTo: { id: string; name: string; avatarColor: string } | null;
  bucket: { id: string; name: string; colorKey: string } | null;
}

function formatDueDate(dateStr: string | null): { label: string; className: string } | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
  const due = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = (due.getTime() - now.getTime()) / 86400000;
  const formatted = due.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (diffDays < 0) return { label: `Overdue · ${formatted}`, className: "text-red-600 dark:text-red-400" };
  if (diffDays <= 2) return { label: `Due ${formatted}`, className: "text-amber-600 dark:text-amber-400" };
  return { label: `Due ${formatted}`, className: "text-muted-foreground" };
}

export default function AllTasksPage() {
  const { data, isLoading } = useSWR<{ tasks: Row[] }>("/api/tasks/all");
  const tasks = data?.tasks ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Tasks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Loading..." : `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-md bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <ClipboardList className="size-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No tasks match your filters.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Title</th>
                  <th className="px-3 py-2 font-medium">Owner</th>
                  <th className="px-3 py-2 font-medium">Due</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Bucket</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const due = formatDueDate(task.dueDate);
                  return (
                    <tr key={task.id} className="border-b last:border-b-0 hover:bg-accent/30 transition-colors">
                      <td className="px-3 py-2">
                        <Link href={`/tasks/${task.id}`} className="font-medium hover:text-primary hover:underline">
                          {task.title}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        {task.assignedTo ? (
                          <span className="flex items-center gap-1.5">
                            <span
                              className="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                              style={{ backgroundColor: task.assignedTo.avatarColor }}
                            >
                              {task.assignedTo.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                            {task.assignedTo.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">Unassigned</span>
                        )}
                      </td>
                      <td className={`px-3 py-2 ${due?.className ?? "text-muted-foreground"}`}>
                        {due?.label ?? "—"}
                      </td>
                      <td className="px-3 py-2"><PriorityBadge priority={task.priority} /></td>
                      <td className="px-3 py-2"><StatusBadge status={task.status} /></td>
                      <td className="px-3 py-2">
                        {task.bucket ? <BucketBadge name={task.bucket.name} colorKey={task.bucket.colorKey} /> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
