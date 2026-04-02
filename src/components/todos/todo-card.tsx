"use client";

import { useState, useCallback } from "react";
import { csrfFetch } from "@/lib/csrf-client";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CelebrationBurst, useCelebration } from "@/components/gamification/celebration";
import { PointsPopup } from "@/components/gamification/points-popup";
import { useUser } from "@/components/user-context";
import { toast } from "sonner";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
}

interface TodoCardProps {
  todo: Todo;
  onDone: () => void;
}

export function TodoCard({ todo, onDone }: TodoCardProps) {
  const { user } = useUser();
  const { mutate } = useSWRConfig();
  const [deleting, setDeleting] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const { celebrationRef, triggerCelebration } = useCelebration();

  const handleDone = useCallback(async () => {
    setDeleting(true);
    try {
      const res = await csrfFetch(`/api/todos/${todo.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      triggerCelebration();
      setShowPoints(true);
      setTimeout(() => setShowPoints(false), 1200);
      if (user) {
        mutate(`/api/points?userId=${user.id}`);
      }
      setTimeout(() => {
        setDismissed(true);
        setDeleting(false);
        setTimeout(() => onDone(), 300);
      }, 600);
    } catch {
      toast.error("Failed to complete to do");
      setDeleting(false);
    }
  }, [todo.id, onDone, triggerCelebration, user, mutate]);

  return (
    <div
      className="relative flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 transition-all duration-300"
      style={
        dismissed
          ? { opacity: 0, transform: "translateX(20px)", maxHeight: 0, marginBottom: 0, padding: 0, overflow: "hidden" }
          : undefined
      }
    >
      <CelebrationBurst ref={celebrationRef} />
      <PointsPopup points={1} show={showPoints} />

      <div className="flex-1 min-w-0">
        <Link
          href={`/todos/${todo.id}`}
          className="text-sm font-medium hover:text-primary hover:underline transition-colors line-clamp-1"
        >
          {todo.title}
        </Link>
        {todo.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {todo.description}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-7 gap-1.5 text-xs shrink-0 text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
        onClick={handleDone}
        disabled={deleting}
      >
        {deleting ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <CheckCircle className="size-3" />
        )}
        Done
      </Button>
    </div>
  );
}
