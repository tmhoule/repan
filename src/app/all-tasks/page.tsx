"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useSWRConfig } from "swr";
import { ClipboardList, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { BucketBadge } from "@/components/buckets/bucket-badge";
import { cn } from "@/lib/utils";
import type { SortKey, SortDir } from "@/lib/all-tasks-query";
import { csrfFetch } from "@/lib/csrf-client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "paused";

const POPUP_STATUSES: { value: TaskStatus | "done"; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "stalled", label: "Stalled" },
  { value: "paused", label: "Paused" },
  { value: "done", label: "Done" },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "blocked", label: "Blocked" },
  { value: "stalled", label: "Stalled" },
  { value: "paused", label: "Paused" },
];

interface TeamMember { id: string; name: string }
interface Bucket { id: string; name: string; colorKey: string }

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

function SortHeader({
  label,
  column,
  sort,
  dir,
  onChange,
}: {
  label: string;
  column: SortKey;
  sort: SortKey;
  dir: SortDir;
  onChange: (sort: SortKey, dir: SortDir) => void;
}) {
  const active = sort === column;
  const next: SortDir = active && dir === "asc" ? "desc" : "asc";
  return (
    <button
      type="button"
      onClick={() => onChange(column, next)}
      className="inline-flex items-center gap-1 font-medium text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {active && (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
    </button>
  );
}

export default function AllTasksPage() {
  const [sort, setSort] = useState<SortKey>("dueDate");
  const [dir, setDir] = useState<SortDir>("asc");
  const [statuses, setStatuses] = useState<TaskStatus[]>([]); // empty = no filter sent (server returns all five)
  const [assignedTo, setAssignedTo] = useState(""); // "" | "unassigned" | <userId>
  const [bucketId, setBucketId] = useState("");     // "" | "uncategorized" | <bucketId>

  const { data: usersData } = useSWR<TeamMember[]>("/api/users");
  const users = usersData ?? [];
  const { data: bucketsData } = useSWR<{ buckets: Bucket[] }>("/api/buckets");
  const buckets = bucketsData?.buckets ?? [];

  const toggleStatus = (s: TaskStatus) =>
    setStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const params = new URLSearchParams();
  params.set("sort", sort);
  params.set("dir", dir);
  statuses.forEach((s) => params.append("status", s));
  if (assignedTo) params.set("assignedTo", assignedTo);
  if (bucketId) params.set("bucketId", bucketId);
  const swrKey = `/api/tasks/all?${params.toString()}`;
  const { data, isLoading } = useSWR<{ tasks: Row[] }>(swrKey);
  const tasks = data?.tasks ?? [];

  const { mutate } = useSWRConfig();

  const handleStatusChange = async (taskId: string, status: TaskStatus | "done") => {
    try {
      const res = await csrfFetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.status === 403) {
        toast.error("You don't have permission to change this task.");
        return;
      }
      if (!res.ok) {
        toast.error("Failed to update status.");
        return;
      }
      mutate(swrKey);
      mutate("/api/tasks"); // keep My Tasks in sync if it's mounted
    } catch {
      toast.error("Failed to update status.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">All Tasks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isLoading ? "Loading..." : `${tasks.length} task${tasks.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-3">
          {/* Status chips */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const active = statuses.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleStatus(opt.value)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Person + bucket dropdowns */}
          <div className="flex items-end gap-4 flex-wrap">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Person</Label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-44"
              >
                <option value="">All</option>
                <option value="unassigned">Unassigned</option>
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
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm w-44"
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
                <tr className="text-left">
                  <th className="px-3 py-2"><SortHeader label="Title" column="title" sort={sort} dir={dir} onChange={(s, d) => { setSort(s); setDir(d); }} /></th>
                  <th className="px-3 py-2"><SortHeader label="Owner" column="owner" sort={sort} dir={dir} onChange={(s, d) => { setSort(s); setDir(d); }} /></th>
                  <th className="px-3 py-2"><SortHeader label="Due" column="dueDate" sort={sort} dir={dir} onChange={(s, d) => { setSort(s); setDir(d); }} /></th>
                  <th className="px-3 py-2"><SortHeader label="Priority" column="priority" sort={sort} dir={dir} onChange={(s, d) => { setSort(s); setDir(d); }} /></th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Bucket</th>
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
                      <td className="px-3 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md"
                            aria-label="Change status"
                          >
                            <StatusBadge status={task.status} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {POPUP_STATUSES.map((opt) => (
                              <DropdownMenuItem
                                key={opt.value}
                                onClick={() => handleStatusChange(task.id, opt.value)}
                                disabled={opt.value === task.status}
                              >
                                {opt.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
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
