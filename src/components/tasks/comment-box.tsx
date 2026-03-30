"use client";

import { useState, useRef } from "react";
import { useSWRConfig } from "swr";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface CommentBoxProps {
  taskId: string;
}

export function CommentBox({ taskId }: CommentBoxProps) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { mutate } = useSWRConfig();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = comment.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });

      if (!res.ok) throw new Error("Failed to post comment");

      setComment("");
      // Revalidate activity log — matches the SWR key used in ActivityLog
      mutate((key) => typeof key === "string" && key.startsWith(`/api/tasks/${taskId}/activity`), undefined, { revalidate: true });
      textareaRef.current?.focus();
    } catch (err) {
      console.error(err);
      setError("Could not post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Label htmlFor="comment-input" className="text-sm font-medium">
        Add a comment
      </Label>
      <Textarea
        id="comment-input"
        ref={textareaRef}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a comment… (Cmd+Enter to submit)"
        rows={3}
        className="resize-none"
        disabled={isSubmitting}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Cmd+Enter to submit</p>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !comment.trim()}
          className="gap-1.5"
        >
          <Send className="size-3.5" />
          {isSubmitting ? "Posting…" : "Post"}
        </Button>
      </div>
    </form>
  );
}
