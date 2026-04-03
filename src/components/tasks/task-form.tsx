"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { csrfFetch } from "@/lib/csrf-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/components/user-context";
import { BucketSelect } from "@/components/buckets/bucket-select";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "done" | "boulder";
type TaskPriority = "high" | "medium" | "low";
type EffortEstimate = "small" | "medium" | "large";

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  effortEstimate: EffortEstimate;
  dueDate: string;
  status?: TaskStatus;
  timeAllocation?: number;
  assignedToId?: string | null;
  blockerReason?: string;
  bucketId?: string | null;
}

interface TaskFormInitialData extends Partial<TaskFormData> {
  id?: string;
}

interface User {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
}

interface TaskFormProps {
  mode: "create" | "edit";
  initialData?: TaskFormInitialData;
  onSubmit?: (data: TaskFormData) => void | Promise<void>;
  teamId?: string;
}

const UNASSIGNED_VALUE = "__unassigned__";

const STATUS_LABELS: Record<string, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  blocked: "Blocked",
  stalled: "Stalled",
  done: "Done",
  boulder: "Boulder",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const EFFORT_LABELS: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export function TaskForm({ mode, initialData, onSubmit, teamId }: TaskFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const isManager = user?.role === "manager";

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(initialData?.priority ?? "medium");
  const [effortEstimate, setEffortEstimate] = useState<EffortEstimate>(
    initialData?.effortEstimate ?? "medium"
  );
  const [dueDate, setDueDate] = useState(initialData?.dueDate ?? "");
  const [status, setStatus] = useState<TaskStatus>(initialData?.status ?? "not_started");
  const [assignedToId, setAssignedToId] = useState<string | null>(
    initialData?.assignedToId !== undefined ? initialData.assignedToId ?? null : null
  );
  const [blockerReason, setBlockerReason] = useState(initialData?.blockerReason ?? "");
  const [timeAllocation, setTimeAllocation] = useState<number>((initialData as any)?.timeAllocation ?? 0);
  const [bucketId, setBucketId] = useState<string | null>(initialData?.bucketId ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  const { data: usersData } = useSWR<User[]>(isManager ? "/api/users" : null);
  const users = usersData ?? [];

  // Sync status changes for blockerReason visibility
  const showBlockerReason = mode === "edit" && status === "blocked";
  const isBoulder = status === "boulder";

  // Auto-save for edit mode: debounce PATCH on any field change
  const autoSave = useCallback(async () => {
    if (mode !== "edit" || !initialData?.id || !title.trim()) return;
    setSaveStatus("saving");
    try {
      const res = await csrfFetch(`/api/tasks/${initialData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          priority,
          effortEstimate,
          dueDate: isBoulder ? null : (dueDate || null),
          status,
          timeAllocation: isBoulder ? timeAllocation : undefined,
          assignedToId,
          bucketId,
          ...(status === "blocked" ? { blockerReason: blockerReason.trim() } : {}),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setErrors({ form: "Auto-save failed. Try again." });
      setSaveStatus("idle");
    }
  }, [mode, initialData?.id, title, description, priority, effortEstimate, dueDate, status, assignedToId, blockerReason, timeAllocation, bucketId, isBoulder]);

  // Trigger auto-save on field changes (edit mode only)
  useEffect(() => {
    if (mode !== "edit" || !initialData?.id) return;
    // Skip auto-save on initial mount / data sync
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(autoSave, 800);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [title, description, priority, effortEstimate, dueDate, status, assignedToId, blockerReason, timeAllocation, bucketId, mode, initialData?.id, autoSave]);

  // Sync initial data if it changes (e.g. after fetch)
  useEffect(() => {
    if (initialData?.title !== undefined) setTitle(initialData.title ?? "");
    if (initialData?.description !== undefined) setDescription(initialData.description ?? "");
    if (initialData?.priority !== undefined) setPriority(initialData.priority ?? "medium");
    if (initialData?.effortEstimate !== undefined)
      setEffortEstimate(initialData.effortEstimate ?? "medium");
    if (initialData?.dueDate !== undefined) setDueDate(initialData.dueDate ?? "");
    if (initialData?.status !== undefined) setStatus(initialData.status ?? "not_started");
    if (initialData?.assignedToId !== undefined)
      setAssignedToId(initialData.assignedToId ?? null);
    if (initialData?.blockerReason !== undefined) setBlockerReason(initialData.blockerReason ?? "");
    if (initialData?.bucketId !== undefined) setBucketId(initialData.bucketId ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.id]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsSubmitting(true);

    const formData: TaskFormData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      effortEstimate,
      dueDate: isBoulder ? "" : dueDate,
      ...(mode === "edit" ? { status } : (isBoulder ? { status: "boulder" } : {})),
      ...(isBoulder && { timeAllocation }),
      assignedToId,
      bucketId,
      ...(showBlockerReason && { blockerReason: blockerReason.trim() }),
    };

    if (onSubmit) {
      try {
        await onSubmit(formData);
      } catch (err) {
        console.error(err);
        setErrors({ form: "Something went wrong. Please try again." });
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      if (mode === "create") {
        const res = await csrfFetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to create task");
        const task = await res.json();
        router.push(`/tasks/${task.id}`);
      } else if (mode === "edit" && initialData?.id) {
        const res = await csrfFetch(`/api/tasks/${initialData.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to update task");
      }
    } catch (err) {
      console.error(err);
      setErrors({ form: "Something went wrong. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} onKeyDown={(e) => { if (mode === "edit" && e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) e.preventDefault(); }} className="space-y-5">
      {errors.form && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          {errors.form}
        </p>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="task-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="task-description">Description</Label>
        <Textarea
          id="task-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details, context, or acceptance criteria…"
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Bucket */}
      {teamId && (
        <div className="space-y-1.5">
          <Label>Bucket</Label>
          <BucketSelect teamId={teamId} value={bucketId} onChange={setBucketId} />
        </div>
      )}

      {/* Priority + Effort row — hidden for boulders */}
      {!isBoulder && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
              <SelectTrigger id="task-priority">
                <SelectValue>{PRIORITY_LABELS[priority]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-effort">Effort Estimate</Label>
            <Select
              value={effortEstimate}
              onValueChange={(v) => setEffortEstimate(v as EffortEstimate)}
            >
              <SelectTrigger id="task-effort">
                <SelectValue>{EFFORT_LABELS[effortEstimate]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Due Date — hidden for boulders */}
      {!isBoulder && (
        <div className="space-y-1.5">
          <Label htmlFor="task-due-date">Due Date</Label>
          <Input
            id="task-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full"
          />
        </div>
      )}

      {/* Time Allocation — shown for boulders */}
      {isBoulder && (
        <div className="space-y-1.5">
          <Label htmlFor="task-time-allocation">
            Time Allocation
            <span className="ml-2 text-purple-600 dark:text-purple-400 font-semibold">{timeAllocation}% of time</span>
          </Label>
          <input
            id="task-time-allocation"
            type="range"
            min={0}
            max={100}
            step={5}
            value={timeAllocation}
            onChange={(e) => setTimeAllocation(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-purple-500"
          />
          <p className="text-xs text-muted-foreground">
            Percentage of working time this boulder consumes (0–100%, in 5% steps)
          </p>
        </div>
      )}

      {/* Status — edit only */}
      {mode === "edit" && (
        <div className="space-y-1.5">
          <Label htmlFor="task-status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
            <SelectTrigger id="task-status">
              <SelectValue>{STATUS_LABELS[status]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="stalled">Stalled</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="boulder">Boulder</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Blocker Reason — shown only when status is blocked in edit mode */}
      {showBlockerReason && (
        <div className="space-y-1.5">
          <Label htmlFor="task-blocker">Blocker Reason</Label>
          <Textarea
            id="task-blocker"
            value={blockerReason}
            onChange={(e) => setBlockerReason(e.target.value)}
            placeholder="Describe what is blocking this task…"
            rows={3}
            className="resize-none"
          />
        </div>
      )}

      {/* Assigned To — managers only */}
      {isManager && (
        <div className="space-y-1.5">
          <Label htmlFor="task-assignee">Assigned To</Label>
          <Select
            value={assignedToId ?? UNASSIGNED_VALUE}
            onValueChange={(v) =>
              setAssignedToId(v === UNASSIGNED_VALUE ? null : v)
            }
          >
            <SelectTrigger id="task-assignee">
              <SelectValue>
                {assignedToId ? (users.find((u) => u.id === assignedToId)?.name ?? "Loading...") : "Unassigned"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED_VALUE}>Unassigned</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Submit (create mode) or auto-save indicator (edit mode) */}
      <div className="flex items-center gap-3 pt-1">
        {mode === "create" ? (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Create Task"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            {saveStatus === "saving" && "Saving…"}
            {saveStatus === "saved" && "✓ Saved"}
          </span>
        )}
      </div>
    </form>
  );
}
