"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskForm, TaskFormData } from "@/components/tasks/task-form";

function NewTaskForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBoulderType = searchParams.get("type") === "boulder";

  const handleSubmit = async (data: TaskFormData) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      throw new Error("Failed to create task");
    }

    const task = await res.json();
    router.push(`/tasks/${task.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/tasks">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to tasks
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          {isBoulderType ? "Create Boulder" : "Create Task"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isBoulderType
            ? "Boulders are ongoing operational efforts with no end date."
            : "Fill in the details below to create a new task."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isBoulderType ? "Boulder Details" : "Task Details"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TaskForm
            mode="create"
            initialData={isBoulderType ? { status: "boulder" } : undefined}
            onSubmit={handleSubmit}
          />
        </CardContent>
      </Card>

      {/* Cancel link */}
      <div className="flex justify-center">
        <Link href="/tasks">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Cancel
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default function NewTaskPage() {
  return (
    <Suspense>
      <NewTaskForm />
    </Suspense>
  );
}
