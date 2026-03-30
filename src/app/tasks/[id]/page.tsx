"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, CalendarDays, User2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { TaskForm, TaskFormData } from "@/components/tasks/task-form";
import { ActivityLog } from "@/components/tasks/activity-log";
import { CommentBox } from "@/components/tasks/comment-box";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { BucketBadge } from "@/components/buckets/bucket-badge";
import { ProgressSlider } from "@/components/tasks/progress-slider";
import { useUser } from "@/components/user-context";
import { canEditTask } from "@/lib/permissions";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "done" | "boulder";
type TaskPriority = "high" | "medium" | "low";
type EffortEstimate = "small" | "medium" | "large";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  effortEstimate: EffortEstimate;
  percentComplete: number;
  timeAllocation: number;
  dueDate: string | null;
  blockerReason: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; avatarColor: string };
  assignedTo: { id: string; name: string; avatarColor: string } | null;
  teamId: string;
  bucket: { id: string; name: string; colorKey: string } | null;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDueDateInput(dateStr: string | null): string {
  if (!dateStr) return "";
  // Extract YYYY-MM-DD directly to avoid UTC→local timezone shift
  return dateStr.split("T")[0];
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      <span className="font-medium text-foreground/70">{label}:</span>
      <span>{value}</span>
    </div>
  );
}

function AvatarDot({ user }: { user: { name: string; avatarColor: string } }) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-semibold mr-1"
      style={{ backgroundColor: user.avatarColor || "#6366f1" }}
    >
      {initials}
    </span>
  );
}

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useUser();
  const { data: task, isLoading, error, mutate } = useSWR<Task>(`/api/tasks/${id}`);

  const canEdit =
    !!user &&
    !!task &&
    canEditTask(
      { id: user.id, role: user.role as "manager" | "staff" },
      { createdById: task.createdBy.id, assignedToId: task.assignedTo?.id ?? null }
    );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div className="h-96 bg-muted rounded-xl" />
          <div className="h-96 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-center space-y-4">
        <p className="text-muted-foreground">Task not found.</p>
        <Link href="/tasks">
          <Button variant="outline" size="sm">
            Back to tasks
          </Button>
        </Link>
      </div>
    );
  }

  const initialData = {
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    priority: task.priority,
    effortEstimate: task.effortEstimate,
    dueDate: formatDueDateInput(task.dueDate),
    status: task.status,
    timeAllocation: task.timeAllocation ?? 0,
    assignedToId: task.assignedTo?.id ?? null,
    blockerReason: task.blockerReason ?? "",
    bucketId: task.bucket?.id ?? null,
  };

  const handleFormSubmit = async (data: TaskFormData) => {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    mutate();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Back button + header */}
      <div className="space-y-3">
        <Link href="/tasks">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to tasks
          </Button>
        </Link>

        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight break-words">{task.title}</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.bucket && (
              <BucketBadge name={task.bucket.name} colorKey={task.bucket.colorKey} />
            )}
          </div>
        </div>

        {/* Metadata row */}
        <div className="flex flex-wrap gap-x-5 gap-y-1.5">
          <MetaItem
            icon={User2}
            label="Created by"
            value={task.createdBy.name}
          />
          {task.assignedTo && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <User2 className="size-4 shrink-0" />
              <span className="font-medium text-foreground/70">Assigned to:</span>
              <AvatarDot user={task.assignedTo} />
              <span>{task.assignedTo.name}</span>
            </div>
          )}
          <MetaItem
            icon={CalendarDays}
            label="Created"
            value={formatDate(task.createdAt)}
          />
          <MetaItem
            icon={Clock}
            label="Updated"
            value={formatDate(task.updatedAt)}
          />
        </div>

        {/* Progress bar — hidden for boulders (ongoing operational tasks) */}
        {task.status !== "boulder" && (
          <div className="max-w-sm">
            <ProgressSlider
              taskId={task.id}
              initialValue={task.percentComplete}
              onUpdate={() => mutate()}
              disabled={!canEdit}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left: form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {canEdit ? "Edit Task" : "Task Details"}
            </CardTitle>
            {!canEdit && (
              <CardDescription>
                You can view this task but don&apos;t have permission to edit it.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {canEdit ? (
              <TaskForm
                mode="edit"
                initialData={initialData}
                onSubmit={handleFormSubmit}
                teamId={task.teamId}
              />
            ) : (
              <ReadOnlyView task={task} />
            )}
          </CardContent>
        </Card>

        {/* Right: activity + comments */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityLog taskId={id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comment</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentBox taskId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReadOnlyView({ task }: { task: Task }) {
  const EFFORT_LABELS: Record<string, string> = {
    small: "Small",
    medium: "Medium",
    large: "Large",
  };

  return (
    <dl className="space-y-4 text-sm">
      <div>
        <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Title</dt>
        <dd className="font-medium">{task.title}</dd>
      </div>
      {task.description && (
        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Description</dt>
          <dd className="whitespace-pre-wrap text-muted-foreground">{task.description}</dd>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Priority</dt>
          <dd><PriorityBadge priority={task.priority} /></dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Effort</dt>
          <dd>{EFFORT_LABELS[task.effortEstimate] ?? task.effortEstimate}</dd>
        </div>
      </div>
      {task.dueDate && (
        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Due Date</dt>
          <dd>{(() => { const [y, m, d] = task.dueDate!.split("T")[0].split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }); })()}</dd>
        </div>
      )}
      {task.blockerReason && task.status === "blocked" && (
        <div>
          <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Blocker</dt>
          <dd className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-red-700 dark:text-red-400">
            {task.blockerReason}
          </dd>
        </div>
      )}
    </dl>
  );
}
