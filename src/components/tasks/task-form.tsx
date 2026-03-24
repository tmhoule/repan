"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
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

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "done";
type TaskPriority = "high" | "medium" | "low";
type EffortEstimate = "small" | "medium" | "large";

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  effortEstimate: EffortEstimate;
  dueDate: string;
  status?: TaskStatus;
  assignedToId?: string | null;
  blockerReason?: string;
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
}

const UNASSIGNED_VALUE = "__unassigned__";

export function TaskForm({ mode, initialData, onSubmit }: TaskFormProps) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: usersData } = useSWR<User[]>(isManager ? "/api/users" : null);
  const users = usersData ?? [];

  // Sync status changes for blockerReason visibility
  const showBlockerReason = mode === "edit" && status === "blocked";

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
      dueDate,
      ...(mode === "edit" && { status }),
      assignedToId,
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
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!res.ok) throw new Error("Failed to create task");
        const task = await res.json();
        router.push(`/tasks/${task.id}`);
      } else if (mode === "edit" && initialData?.id) {
        const res = await fetch(`/api/tasks/${initialData.id}`, {
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
    <form onSubmit={handleSubmit} className="space-y-5">
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

      {/* Priority + Effort row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="task-priority">Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
            <SelectTrigger id="task-priority">
              <SelectValue />
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
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Small</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="large">Large</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Due Date */}
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

      {/* Status — edit only */}
      {mode === "edit" && (
        <div className="space-y-1.5">
          <Label htmlFor="task-status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
            <SelectTrigger id="task-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="stalled">Stalled</SelectItem>
              <SelectItem value="done">Done</SelectItem>
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
              <SelectValue placeholder="Unassigned" />
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

      {/* Submit */}
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "create"
              ? "Creating…"
              : "Saving…"
            : mode === "create"
            ? "Create Task"
            : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
