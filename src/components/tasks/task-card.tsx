"use client";

import { useState, useCallback, useRef, KeyboardEvent } from "react";
import Link from "next/link";
import { useSWRConfig } from "swr";
import {
  CheckCircle,
  ChevronDown,
  AlertTriangle,
  Clock,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/tasks/status-badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { ProgressSlider } from "@/components/tasks/progress-slider";
import { CelebrationBurst, useCelebration } from "@/components/gamification/celebration";
import { PointsPopup } from "@/components/gamification/points-popup";
import { cn } from "@/lib/utils";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "done";
type TaskPriority = "high" | "medium" | "low";

interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  effortEstimate: "small" | "medium" | "large";
  percentComplete: number;
  dueDate: string | null;
  blockerReason?: string | null;
  createdBy: { id: string; name: string; avatarColor: string };
  assignedTo?: { id: string; name: string; avatarColor: string } | null;
}

const EFFORT_POINTS: Record<string, number> = { small: 10, medium: 25, large: 50 };

const STATUS_BORDER_COLORS: Record<TaskStatus, string> = {
  not_started: "#8B90A0",
  in_progress: "#3B82F6",
  blocked: "#EF4444",
  stalled: "#F97316",
  done: "#10B981",
};

interface TaskCardProps {
  task: Task;
  onUpdate?: () => void;
}

function formatDueDate(dateStr: string | null): {
  label: string;
  className: string;
} | null {
  if (!dateStr) return null;
  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  const formatted = due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  if (diffDays < 0) {
    return {
      label: `Overdue · ${formatted}`,
      className: "text-red-600 dark:text-red-400",
    };
  } else if (diffDays <= 2) {
    return {
      label: `Due ${formatted}`,
      className: "text-amber-600 dark:text-amber-400",
    };
  }
  return { label: `Due ${formatted}`, className: "text-muted-foreground" };
}

export function TaskCard({ task, onUpdate }: TaskCardProps) {
  const { mutate } = useSWRConfig();
  const [showPointsPopup, setShowPointsPopup] = useState(false);
  const [currentTask, setCurrentTask] = useState(task);
  const { celebrationRef, triggerCelebration } = useCelebration();

  const patchTask = useCallback(
    async (data: Partial<Task>) => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update task");
      const updated = await res.json();
      setCurrentTask(updated);
      mutate("/api/tasks");
      onUpdate?.();
      return updated;
    },
    [task.id, mutate, onUpdate]
  );

  const handleMarkDone = useCallback(async () => {
    if (currentTask.status === "done") return;
    try {
      await patchTask({ status: "done" });
      triggerCelebration();
      setShowPointsPopup(true);
      setTimeout(() => setShowPointsPopup(false), 1200);
    } catch (error) {
      console.error("Failed to mark task done:", error);
    }
  }, [currentTask.status, patchTask, triggerCelebration]);

  const handleStatusChange = useCallback(
    async (status: TaskStatus) => {
      try {
        await patchTask({ status });
      } catch (error) {
        console.error("Failed to update status:", error);
      }
    },
    [patchTask]
  );

  const dueDateInfo = formatDueDate(currentTask.dueDate);
  const isDone = currentTask.status === "done";

  const statusBorderColor = STATUS_BORDER_COLORS[currentTask.status];

  return (
    <Card
      className={cn(
        "relative transition-all duration-200 overflow-hidden pl-0",
        isDone && "opacity-60"
      )}
      style={{
        borderLeft: `3px solid ${statusBorderColor}`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = `rgba(139,92,246,0.3)`;
        el.style.borderLeftColor = statusBorderColor;
        el.style.boxShadow = "0 4px 16px rgba(139,92,246,0.15)";
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "";
        el.style.borderLeftColor = statusBorderColor;
        el.style.boxShadow = "";
        el.style.transform = "";
      }}
    >
      <CelebrationBurst ref={celebrationRef} />
      <PointsPopup points={EFFORT_POINTS[currentTask.effortEstimate] ?? 25} show={showPointsPopup} />

      <CardHeader className="pb-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="flex-1 min-w-0">
            <Link
              href={`/tasks/${currentTask.id}`}
              className="font-medium text-sm hover:text-primary hover:underline line-clamp-2 transition-colors"
            >
              {currentTask.title}
            </Link>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            <StatusBadge status={currentTask.status} />
            <PriorityBadge priority={currentTask.priority} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Due date */}
        {dueDateInfo && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              dueDateInfo.className
            )}
          >
            <Clock className="size-3" />
            <span>{dueDateInfo.label}</span>
          </div>
        )}

        {/* Interactive progress slider (doubles as the progress bar) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span className="tabular-nums">{currentTask.percentComplete}%</span>
          </div>
          {isDone ? (
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-green-500 w-full" />
            </div>
          ) : (
            <ProgressSlider
              taskId={currentTask.id}
              initialValue={currentTask.percentComplete}
              onUpdate={(v) =>
                setCurrentTask((t) => ({ ...t, percentComplete: v }))
              }
              className="!gap-0"
              compact
            />
          )}
        </div>

        {/* Blocker reason */}
        {currentTask.status === "blocked" && currentTask.blockerReason && (
          <div className="flex items-start gap-1.5 rounded-md bg-red-50 dark:bg-red-950/30 px-2 py-1.5 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="size-3 mt-0.5 shrink-0" />
            <span>{currentTask.blockerReason}</span>
          </div>
        )}

        {/* Quick actions + inline comment */}
        {!isDone && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              {/* Flag (left) */}
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex h-7 items-center gap-1 rounded-lg border border-input bg-transparent px-2 text-xs hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                  Flag
                  <ChevronDown className="size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" side="bottom">
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("blocked")}
                    className="text-red-600 dark:text-red-400"
                  >
                    Mark Blocked
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("stalled")}
                    className="text-orange-600 dark:text-orange-400"
                  >
                    Mark Stalled
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("in_progress")}
                  >
                    Mark In Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleStatusChange("not_started")}
                  >
                    Reset to Not Started
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Inline comment (middle, expands) */}
              <InlineComment taskId={currentTask.id} onSubmit={onUpdate} />

              {/* Done (right) */}
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs shrink-0 text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
                onClick={handleMarkDone}
              >
                <CheckCircle className="size-3.5" />
                Done
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InlineComment({ taskId, onSubmit }: { taskId: string; onSubmit?: () => void }) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(async () => {
    const text = value.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        setValue("");
        onSubmit?.();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  }, [taskId, value, sending, onSubmit]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex items-center gap-1 h-7 rounded-lg border border-input bg-transparent px-2 focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-ring transition-all">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Comment... (⌘↵)"
        className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/50 min-w-0"
        disabled={sending}
      />
      {value.trim() && (
        <button
          onClick={handleSend}
          disabled={sending}
          className="text-primary hover:text-primary/80 transition-colors shrink-0"
        >
          <Send className="size-3" />
        </button>
      )}
    </div>
  );
}
