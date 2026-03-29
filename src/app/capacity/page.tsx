"use client";

import Link from "next/link";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";

type Priority = "high" | "medium" | "low";

interface CapacityTask {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string;
  percentComplete: number;
}

interface CapacityPerson {
  user: { id: string; name: string; avatarColor: string };
  boulderPct: number;
  thisWeek: { tasks: CapacityTask[]; load: number };
  nextWeek: { tasks: CapacityTask[]; load: number };
  noDueDate: number;
}

function loadColor(load: number): string {
  if (load > 100) return "text-red-400";
  if (load >= 80) return "text-amber-400";
  return "text-emerald-400";
}

function loadBg(load: number): string {
  if (load > 100) return "bg-red-500/15";
  if (load >= 80) return "bg-amber-500/15";
  return "bg-emerald-500/15";
}

function WeekCell({ data }: { data: { tasks: CapacityTask[]; load: number } }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={`text-lg font-bold tabular-nums ${loadColor(data.load)}`}>
          {data.load}%
        </span>
        <span className="text-xs text-muted-foreground">{data.tasks.length} task{data.tasks.length !== 1 ? "s" : ""}</span>
      </div>
      {data.tasks.length > 0 && (
        <div className="space-y-0.5">
          {data.tasks.map((t) => (
            <Link
              key={t.id}
              href={`/tasks/${t.id}`}
              className="block text-xs text-muted-foreground hover:text-foreground hover:underline truncate"
            >
              {t.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CapacityPage() {
  const { data, isLoading } = useSWR<{ capacity: CapacityPerson[] }>("/api/capacity");
  const capacity = data?.capacity ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Capacity Planning</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Forward-looking workload based on task due dates
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : capacity.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No team members found.</p>
      ) : (
        <div className="space-y-3">
          {capacity.map((person) => (
            <Card key={person.user.id}>
              <CardContent className="py-3">
                <div className="grid grid-cols-[160px_1fr_1fr] gap-4 items-start">
                  {/* Person */}
                  <div className="flex items-center gap-2">
                    <span
                      className="size-7 rounded-full shrink-0 inline-flex items-center justify-center text-white text-[10px] font-bold"
                      style={{ backgroundColor: person.user.avatarColor }}
                    >
                      {person.user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{person.user.name}</p>
                      {person.boulderPct > 0 && (
                        <p className="text-[11px] text-purple-400">{person.boulderPct}% boulder</p>
                      )}
                      {person.noDueDate > 0 && (
                        <p className="text-[11px] text-muted-foreground">+{person.noDueDate} undated</p>
                      )}
                    </div>
                  </div>

                  {/* This week */}
                  <div className={`rounded-lg p-3 ${loadBg(person.thisWeek.load)}`}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">This Week</p>
                    <WeekCell data={person.thisWeek} />
                  </div>

                  {/* Next week */}
                  <div className={`rounded-lg p-3 ${loadBg(person.nextWeek.load)}`}>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Next Week</p>
                    <WeekCell data={person.nextWeek} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
