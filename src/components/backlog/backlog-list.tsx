"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  CheckCircle,
  Loader2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { ForecastBadge } from "@/components/backlog/forecast-badge";
import { useUser } from "@/components/user-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TaskPriority = "high" | "medium" | "low";
type EffortEstimate = "small" | "medium" | "large";

interface ForecastResult {
  id: string;
  effortAhead: number;
  weeksToStart: number | null;
}

interface BacklogTask {
  id: string;
  title: string;
  priority: TaskPriority;
  effortEstimate: EffortEstimate;
  backlogPosition: number | null;
  createdBy: { id: string; name: string; avatarColor: string };
  forecast?: ForecastResult;
}

interface BacklogListProps {
  tasks: BacklogTask[];
  onMutate: () => void;
}

const effortConfig: Record<EffortEstimate, { label: string; className: string }> = {
  small: {
    label: "Low Effort",
    className:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-400 dark:border-teal-800",
  },
  medium: {
    label: "Medium Effort",
    className:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-400 dark:border-violet-800",
  },
  large: {
    label: "High Effort",
    className:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800",
  },
};

interface SortableItemProps {
  task: BacklogTask;
  isManager: boolean;
  onClaim: (taskId: string) => void;
  claimingId: string | null;
  claimedId: string | null;
}

function SortableItem({ task, isManager, onClaim, claimingId, claimedId }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const effort = effortConfig[task.effortEstimate] ?? effortConfig.medium;
  const isClaiming = claimingId === task.id;
  const isClaimed = claimedId === task.id;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(isClaimed
          ? {
              transform: "translateY(-80px) scale(0.95)",
              opacity: 0,
              transition: "all 500ms cubic-bezier(0.4, 0, 0.2, 1)",
              background: "rgba(139, 92, 246, 0.15)",
              borderColor: "rgba(139, 92, 246, 0.4)",
            }
          : {}),
      }}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all duration-200",
        isDragging
          ? "shadow-lg ring-2 ring-primary/20 z-50 opacity-90"
          : "hover:shadow-sm hover:border-border/80"
      )}
    >
      {/* Drag handle (manager only) */}
      {isManager && (
        <button
          {...attributes}
          {...listeners}
          className="flex-none text-muted-foreground/40 hover:text-muted-foreground cursor-grab active:cursor-grabbing touch-none transition-colors"
          aria-label="Drag to reorder"
        >
          <GripVertical className="size-4" />
        </button>
      )}

      {/* Position indicator */}
      <span className="flex-none w-6 text-center text-xs font-medium tabular-nums text-muted-foreground/60">
        {task.backlogPosition ?? "—"}
      </span>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/tasks/${task.id}`}
          className="text-sm font-medium leading-snug line-clamp-2 hover:text-primary hover:underline transition-colors"
        >
          {task.title}
        </Link>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          by {task.createdBy.name}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
        <PriorityBadge priority={task.priority} />
        <Badge
          variant="outline"
          className={cn("text-xs font-semibold border", effort.className)}
          title={`Effort: ${task.effortEstimate}`}
        >
          {effort.label}
        </Badge>
        {task.forecast && (
          <ForecastBadge weeksToStart={task.forecast.weeksToStart} />
        )}
      </div>

      {/* Claim button (staff only) */}
      {!isManager && (
        <Button
          size="sm"
          variant="default"
          className="h-8 gap-1.5 text-xs ml-2 shrink-0"
          onClick={() => onClaim(task.id)}
          disabled={isClaiming}
        >
          {isClaiming ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle className="size-3.5" />
          )}
          Claim
        </Button>
      )}
    </div>
  );
}

export function BacklogList({ tasks: initialTasks, onMutate }: BacklogListProps) {
  const { user } = useUser();
  const isManager = user?.role === "manager";

  const [tasks, setTasks] = useState<BacklogTask[]>(initialTasks);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimedId, setClaimedId] = useState<string | null>(null);

  // Keep local task state in sync when prop changes (SWR refresh)
  // but only if we're not mid-drag
  const [isDragging, setIsDragging] = useState(false);

  if (!isDragging && tasks !== initialTasks) {
    setTasks(initialTasks);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setIsDragging(false);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = tasks.findIndex((t) => t.id === active.id);
      const newIndex = tasks.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(tasks, oldIndex, newIndex).map((t, i) => ({
        ...t,
        backlogPosition: i + 1,
      }));
      setTasks(reordered);

      try {
        const res = await fetch("/api/backlog/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskIds: reordered.map((t) => t.id) }),
        });
        if (!res.ok) throw new Error("Failed to reorder");
        onMutate();
        toast.success("Backlog order saved");
      } catch {
        toast.error("Failed to save order");
        setTasks(initialTasks);
        onMutate();
      }
    },
    [tasks, initialTasks, onMutate]
  );

  const handleClaim = useCallback(
    async (taskId: string) => {
      setClaimingId(taskId);
      try {
        const res = await fetch("/api/backlog/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to claim task");
        }
        // Animate the claimed task out before removing it
        setClaimedId(taskId);
        setTimeout(() => {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          setClaimedId(null);
          setClaimingId(null);
          toast.success("Task claimed! It's now in your task list above.");
          onMutate();
        }, 500);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to claim task");
        setClaimingId(null);
      }
    },
    [onMutate]
  );

  if (tasks.length === 0) return null;

  const taskIds = tasks.map((t) => t.id);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {isManager && (
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 pb-1">
              <GripVertical className="size-3.5" />
              Drag items to reorder the backlog
            </p>
          )}
          {tasks.map((task) => (
            <SortableItem
              key={task.id}
              task={task}
              isManager={isManager}
              onClaim={handleClaim}
              claimedId={claimedId}
              claimingId={claimingId}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
