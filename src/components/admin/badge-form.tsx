"use client";

import { useState, useEffect } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type CriteriaType =
  | "count_action"
  | "streak_milestone"
  | "consecutive_action"
  | "single_day_count"
  | "total_points";

interface BadgeFormData {
  id?: string;
  name: string;
  description: string;
  icon: string;
  criteriaType: CriteriaType;
  criteriaValue: Record<string, unknown>;
  isActive?: boolean;
}

interface BadgeFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: BadgeFormData | null;
}

const CRITERIA_TYPES: { value: CriteriaType; label: string }[] = [
  { value: "count_action", label: "Count Action" },
  { value: "streak_milestone", label: "Streak Milestone" },
  { value: "consecutive_action", label: "Consecutive Action" },
  { value: "single_day_count", label: "Single Day Count" },
  { value: "total_points", label: "Total Points" },
];

const STREAK_TYPES = [
  { value: "daily_checkin", label: "Daily Check-in" },
  { value: "momentum", label: "Momentum" },
  { value: "weekly_goal", label: "Weekly Goal" },
];

function CriteriaFields({
  type,
  value,
  onChange,
}: {
  type: CriteriaType;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
}) {
  if (type === "count_action") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Action Name</Label>
          <Input
            placeholder="e.g. complete_task"
            value={(value.action as string) ?? ""}
            onChange={(e) => onChange({ ...value, action: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Count</Label>
          <Input
            type="number"
            min={1}
            placeholder="e.g. 10"
            value={(value.count as number) ?? ""}
            onChange={(e) =>
              onChange({ ...value, count: parseInt(e.target.value, 10) || "" })
            }
          />
        </div>
      </div>
    );
  }

  if (type === "streak_milestone") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Streak Type</Label>
          <Select
            value={(value.streakType as string) ?? ""}
            onValueChange={(v) => onChange({ ...value, streakType: v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select streak type" />
            </SelectTrigger>
            <SelectContent>
              {STREAK_TYPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Count</Label>
          <Input
            type="number"
            min={1}
            placeholder="e.g. 7"
            value={(value.count as number) ?? ""}
            onChange={(e) =>
              onChange({ ...value, count: parseInt(e.target.value, 10) || "" })
            }
          />
        </div>
      </div>
    );
  }

  if (type === "consecutive_action") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Action Name</Label>
          <Input
            placeholder="e.g. complete_task"
            value={(value.action as string) ?? ""}
            onChange={(e) => onChange({ ...value, action: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Days in a Row</Label>
          <Input
            type="number"
            min={1}
            placeholder="e.g. 5"
            value={(value.days as number) ?? ""}
            onChange={(e) =>
              onChange({ ...value, days: parseInt(e.target.value, 10) || "" })
            }
          />
        </div>
      </div>
    );
  }

  if (type === "single_day_count") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Action Name</Label>
          <Input
            placeholder="e.g. complete_task"
            value={(value.action as string) ?? ""}
            onChange={(e) => onChange({ ...value, action: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Count in One Day</Label>
          <Input
            type="number"
            min={1}
            placeholder="e.g. 5"
            value={(value.count as number) ?? ""}
            onChange={(e) =>
              onChange({ ...value, count: parseInt(e.target.value, 10) || "" })
            }
          />
        </div>
      </div>
    );
  }

  if (type === "total_points") {
    return (
      <div className="space-y-1.5">
        <Label>Total Points Required</Label>
        <Input
          type="number"
          min={1}
          placeholder="e.g. 100"
          value={(value.points as number) ?? ""}
          onChange={(e) =>
            onChange({ ...value, points: parseInt(e.target.value, 10) || "" })
          }
        />
      </div>
    );
  }

  return null;
}

export function BadgeForm({ open, onClose, onSave, initialData }: BadgeFormProps) {
  const isEdit = !!initialData?.id;

  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [icon, setIcon] = useState(initialData?.icon ?? "");
  const [criteriaType, setCriteriaType] = useState<CriteriaType>(
    initialData?.criteriaType ?? "count_action"
  );
  const [criteriaValue, setCriteriaValue] = useState<Record<string, unknown>>(
    (initialData?.criteriaValue as Record<string, unknown>) ?? {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialData?.name ?? "");
    setDescription(initialData?.description ?? "");
    setIcon(initialData?.icon ?? "");
    setCriteriaType(initialData?.criteriaType ?? "count_action");
    setCriteriaValue((initialData?.criteriaValue as Record<string, unknown>) ?? {});
    setError(null);
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    if (!icon.trim()) { setError("Icon is required."); return; }
    if (!description.trim()) { setError("Description is required."); return; }
    setSubmitting(true);
    setError(null);
    try {
      const url = isEdit ? `/api/awards/${initialData!.id}` : "/api/awards";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          icon: icon.trim(),
          criteriaType,
          criteriaValue,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to save badge.");
      }
      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Badge" : "Create Badge"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name + Icon row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="badge-name">Name</Label>
              <Input
                id="badge-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Badge name"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="badge-icon">Icon</Label>
              <Input
                id="badge-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="🏆 or name"
                className="text-lg"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="badge-desc">Description</Label>
            <Textarea
              id="badge-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what earns this badge..."
              rows={2}
            />
          </div>

          {/* Criteria type */}
          <div className="space-y-1.5">
            <Label>Criteria Type</Label>
            <Select
              value={criteriaType}
              onValueChange={(v) => {
                setCriteriaType(v as CriteriaType);
                setCriteriaValue({});
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRITERIA_TYPES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic criteria fields */}
          <div className="rounded-lg bg-muted/30 border border-border p-3 space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Criteria Parameters
            </p>
            <CriteriaFields
              type={criteriaType}
              value={criteriaValue}
              onChange={setCriteriaValue}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter showCloseButton={false}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Badge"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
