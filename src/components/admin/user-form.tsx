"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const AVATAR_COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#6b7280", label: "Gray" },
];

interface UserFormData {
  id?: string;
  name: string;
  role: "manager" | "staff";
  avatarColor: string;
  isActive?: boolean;
}

interface Team {
  id: string;
  name: string;
}

interface UserFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  initialData?: UserFormData | null;
}

export function UserForm({ open, onClose, onSave, initialData }: UserFormProps) {
  const isEdit = !!initialData?.id;

  const [name, setName] = useState(initialData?.name ?? "");
  const [role, setRole] = useState<"manager" | "staff">(initialData?.role ?? "staff");
  const [avatarColor, setAvatarColor] = useState(initialData?.avatarColor ?? AVATAR_COLORS[0].value);
  const [selectedTeamIds, setSelectedTeamIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all teams
  const { data: teams } = useSWR<Team[]>(open ? "/api/teams" : null);

  // Fetch user's current teams when editing
  useEffect(() => {
    if (isEdit && initialData?.id && open) {
      fetch(`/api/users/${initialData.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.teamMemberships) {
            setSelectedTeamIds(new Set(data.teamMemberships.map((m: { team: { id: string } }) => m.team.id)));
          }
        })
        .catch(() => {});
    }
  }, [isEdit, initialData?.id, open]);

  // Reset form when initialData changes
  useEffect(() => {
    setName(initialData?.name ?? "");
    setRole(initialData?.role ?? "staff");
    setAvatarColor(initialData?.avatarColor ?? AVATAR_COLORS[0].value);
    if (!isEdit) setSelectedTeamIds(new Set());
    setError(null);
  }, [initialData, open, isEdit]);

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId);
      else next.add(teamId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const url = isEdit ? `/api/users/${initialData!.id}` : "/api/users";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          avatarColor,
          teamIds: Array.from(selectedTeamIds),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Failed to save user.");
      }

      // If editing, sync team memberships
      if (isEdit && initialData?.id) {
        await fetch(`/api/users/${initialData.id}/teams`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamIds: Array.from(selectedTeamIds) }),
        });
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    if (!confirm(`Delete ${initialData.name}? Their open tasks will be moved to the backlog.`)) return;
    setDeactivating(true);
    try {
      const res = await fetch(`/api/users/${initialData.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      onSave();
      onClose();
    } catch {
      setError("Failed to delete user.");
    } finally {
      setDeactivating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Create User"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="user-name">Name</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoFocus
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "manager" | "staff")}>
              <SelectTrigger className="w-full">
                <SelectValue>{role === "manager" ? "Manager" : "Staff"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Avatar Color */}
          <div className="space-y-1.5">
            <Label>Avatar Color</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => setAvatarColor(c.value)}
                  className={`size-8 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
                    avatarColor === c.value
                      ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.value }}
                  aria-pressed={avatarColor === c.value}
                  aria-label={c.label}
                />
              ))}
            </div>
          </div>

          {/* Team Assignments */}
          {(teams ?? []).length > 0 && (
            <div className="space-y-1.5">
              <Label>Teams</Label>
              <div className="space-y-1.5 rounded-lg border border-border p-3 max-h-40 overflow-y-auto">
                {(teams ?? []).map((team) => (
                  <label
                    key={team.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent/50 rounded px-2 py-1.5 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.has(team.id)}
                      onChange={() => toggleTeam(team.id)}
                      className="size-4 rounded border-input accent-primary"
                    />
                    <span className="text-sm">{team.name}</span>
                  </label>
                ))}
              </div>
              {selectedTeamIds.size === 0 && (
                <p className="text-xs text-muted-foreground">Select at least one team</p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter showCloseButton={false}>
            {isEdit && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deactivating || submitting}
                className="mr-auto"
              >
                {deactivating ? "Deleting..." : "Delete User"}
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={submitting} onClick={handleSubmit}>
              {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
