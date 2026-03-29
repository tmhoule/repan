"use client";

import Link from "next/link";
import useSWR from "swr";
import { CheckCircle2, Circle, Ban } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/tasks/priority-badge";

type Priority = "high" | "medium" | "low";

interface StandupTask {
  id: string;
  title: string;
  priority: Priority;
  status?: string;
  blockerReason?: string | null;
}

interface StandupPerson {
  user: { id: string; name: string; avatarColor: string };
  yesterday: StandupTask[];
  today: StandupTask[];
  blocked: StandupTask[];
}

interface StandupData {
  standup: StandupPerson[];
  date: string;
}

function TaskItem({ task, icon }: { task: StandupTask; icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <Link
        href={`/tasks/${task.id}`}
        className="text-sm hover:text-primary hover:underline transition-colors line-clamp-1 flex-1"
      >
        {task.title}
      </Link>
      <PriorityBadge priority={task.priority} className="shrink-0" />
    </div>
  );
}

export default function StandupPage() {
  const { data, isLoading } = useSWR<StandupData>("/api/standup");
  const standup = data?.standup ?? [];

  const dateStr = data?.date
    ? new Date(data.date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    : "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Standup</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{dateStr}</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : standup.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No team members found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {standup.map((person) => {
            const hasContent = person.yesterday.length > 0 || person.today.length > 0 || person.blocked.length > 0;
            return (
              <Card key={person.user.id} className={!hasContent ? "opacity-50" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <span
                      className="size-6 rounded-full shrink-0 inline-flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: person.user.avatarColor }}
                    >
                      {person.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                    {person.user.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Yesterday */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Yesterday</p>
                    {person.yesterday.length > 0 ? (
                      person.yesterday.map((t) => (
                        <TaskItem key={t.id} task={t} icon={<CheckCircle2 className="size-3.5 text-green-500" />} />
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground/60">&mdash;</p>
                    )}
                  </div>

                  {/* Today */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Today</p>
                    {person.today.length > 0 ? (
                      person.today.map((t) => (
                        <TaskItem key={t.id} task={t} icon={<Circle className="size-3.5 text-blue-400" />} />
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground/60">&mdash;</p>
                    )}
                  </div>

                  {/* Blocked */}
                  {person.blocked.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-red-400 uppercase tracking-wide mb-1">Blocked</p>
                      {person.blocked.map((t) => (
                        <div key={t.id}>
                          <TaskItem task={t} icon={<Ban className="size-3.5 text-red-400" />} />
                          {t.blockerReason && (
                            <p className="text-xs text-red-400/70 ml-5.5 mt-0.5 line-clamp-1">{t.blockerReason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
