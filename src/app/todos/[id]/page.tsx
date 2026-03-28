"use client";

import { use, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface Todo {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
}

export default function TodoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: todo, isLoading, error } = useSWR<Todo>(`/api/todos/${id}`);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description ?? "");
      isInitialMount.current = true;
    }
  }, [todo?.id]);

  const autoSave = useCallback(async () => {
    if (!todo || !title.trim()) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }, [todo?.id, title, description]);

  useEffect(() => {
    if (!todo) return;
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(autoSave, 800);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [title, description, todo?.id, autoSave]);

  const handleDelete = async () => {
    if (!todo) return;
    if (!confirm("Delete this to do?")) return;
    await fetch(`/api/todos/${todo.id}`, { method: "DELETE" });
    router.push("/tasks");
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error || !todo) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 text-center space-y-4">
        <p className="text-muted-foreground">To do not found.</p>
        <Link href="/tasks">
          <Button variant="outline" size="sm">Back to tasks</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div className="space-y-2">
        <Link href="/tasks">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to tasks
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Edit To Do</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">To Do Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="todo-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="todo-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="todo-description">Description</Label>
              <Textarea
                id="todo-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {saveStatus === "saving" && "Saving..."}
                {saveStatus === "saved" && "Saved"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-950/30 gap-1.5"
                onClick={handleDelete}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
