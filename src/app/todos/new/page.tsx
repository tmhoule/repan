"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { csrfFetch } from "@/lib/csrf-client";
import Link from "next/link";
import { useSWRConfig } from "swr";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CelebrationBurst, useCelebration } from "@/components/gamification/celebration";
import { PointsPopup } from "@/components/gamification/points-popup";
import { useUser } from "@/components/user-context";

export default function NewTodoPage() {
  const router = useRouter();
  const { user } = useUser();
  const { mutate } = useSWRConfig();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPoints, setShowPoints] = useState(false);
  const { celebrationRef, triggerCelebration } = useCelebration();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const res = await csrfFetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to create to do");
      triggerCelebration();
      setShowPoints(true);
      if (user) {
        mutate(`/api/points?userId=${user.id}`);
      }
      setTimeout(() => router.push("/tasks"), 800);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6 relative">
      <CelebrationBurst ref={celebrationRef} />
      <PointsPopup points={1} show={showPoints} />

      <div className="space-y-2">
        <Link href="/tasks">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to tasks
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create To Do</h1>
        <p className="text-sm text-muted-foreground">Quick personal item — no tracking, no due dates.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">To Do Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="todo-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="todo-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Email Tom about tomorrow"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="todo-description">Description</Label>
              <Textarea
                id="todo-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details..."
                rows={3}
                className="resize-none"
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create To Do"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Link href="/tasks">
          <Button variant="ghost" size="sm" className="text-muted-foreground">Cancel</Button>
        </Link>
      </div>
    </div>
  );
}
