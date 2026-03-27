"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  BUCKET_COLORS,
  VALID_COLOR_KEYS,
  type BucketColorKey,
} from "@/lib/bucket-colors";
import { toast } from "sonner";

interface Bucket {
  id: string;
  name: string;
  colorKey: string;
}

interface ManageBucketsDialogProps {
  teamId: string;
  onMutate: () => void;
}

function ColorPalette({
  selected,
  onSelect,
}: {
  selected: BucketColorKey;
  onSelect: (color: BucketColorKey) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {VALID_COLOR_KEYS.map((key) => {
        const color = BUCKET_COLORS[key];
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={cn(
              "size-6 rounded-full transition-all",
              color.dotColor,
              selected === key
                ? "ring-2 ring-offset-2 ring-primary ring-offset-background"
                : "hover:scale-110"
            )}
            title={color.label}
          />
        );
      })}
    </div>
  );
}

export function ManageBucketsDialog({ teamId, onMutate }: ManageBucketsDialogProps) {
  const { data, mutate: mutateBuckets } = useSWR<{ buckets: Bucket[] }>(
    `/api/teams/${teamId}/buckets`
  );
  const buckets = data?.buckets ?? [];

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<BucketColorKey>("blue");
  const [isAdding, setIsAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<BucketColorKey>("blue");

  const startEditing = (bucket: Bucket) => {
    setEditingId(bucket.id);
    setEditName(bucket.name);
    setEditColor(bucket.colorKey as BucketColorKey);
  };

  const handleSaveEdit = async (bucketId: string) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/buckets/${bucketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), colorKey: editColor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update bucket");
      }
      toast.success("Bucket updated");
      setEditingId(null);
      mutateBuckets();
      onMutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update bucket");
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/buckets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), colorKey: newColor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create bucket");
      }
      toast.success("Bucket created");
      setNewName("");
      setNewColor("blue");
      mutateBuckets();
      onMutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bucket");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (bucket: Bucket) => {
    if (!confirm(`Delete "${bucket.name}"? Tasks in this bucket will become uncategorized.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/teams/${teamId}/buckets/${bucket.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete bucket");
      }
      toast.success("Bucket deleted");
      mutateBuckets();
      onMutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete bucket");
    }
  };

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5" />
        }
      >
        <Plus className="size-4" />
        Manage Buckets
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Buckets</DialogTitle>
        </DialogHeader>

        {/* Existing buckets */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {buckets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No buckets yet. Create one below.
            </p>
          ) : (
            buckets.map((bucket) => {
              const color = BUCKET_COLORS[bucket.colorKey as BucketColorKey];

              if (editingId === bucket.id) {
                return (
                  <div key={bucket.id} className="space-y-2 rounded-lg border border-border p-3">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(bucket.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <ColorPalette selected={editColor} onSelect={setEditColor} />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs"
                        onClick={() => handleSaveEdit(bucket.id)}
                      >
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={bucket.id}
                  className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <span
                    className={cn(
                      "size-3 rounded-full shrink-0",
                      color?.dotColor ?? "bg-gray-400"
                    )}
                  />
                  <button
                    onClick={() => startEditing(bucket)}
                    className="flex-1 text-left text-sm font-medium hover:text-primary transition-colors truncate"
                  >
                    {bucket.name}
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(bucket)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Add new bucket */}
        <div className="border-t border-border pt-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Add Bucket
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
              }}
              placeholder="Bucket name..."
              className="h-8 text-sm flex-1"
            />
            <Button
              size="sm"
              variant="default"
              className="h-8 gap-1 text-xs shrink-0"
              onClick={handleAdd}
              disabled={isAdding || !newName.trim()}
            >
              <Plus className="size-3.5" />
              Add
            </Button>
          </div>
          <ColorPalette selected={newColor} onSelect={setNewColor} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
