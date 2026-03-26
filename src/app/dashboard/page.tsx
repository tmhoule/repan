"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useUser } from "@/components/user-context";
import { WorkloadChart } from "@/components/dashboard/workload-chart";
import { AtRiskList } from "@/components/dashboard/at-risk-list";
import { BacklogHealth } from "@/components/dashboard/backlog-health";
import { ThroughputChart } from "@/components/dashboard/throughput-chart";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { KeyProjects } from "@/components/dashboard/key-projects";

type TaskStatus = "not_started" | "in_progress" | "blocked" | "stalled" | "done";
type TaskPriority = "high" | "medium" | "low";

interface DashboardData {
  workload: Array<{
    user: { id: string; name: string; avatarColor: string };
    taskCount: number;
    byPriority: { high: number; medium: number; low: number };
    boulders?: Array<{ title: string; timeAllocation: number }>;
  }>;
  atRisk: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    priority: TaskPriority;
    percentComplete?: number;
    dueDate?: string | null;
    assignedTo?: { id: string; name: string } | null;
    riskFlags?: Array<{ riskType: string; label: string }>;
  }>;
  backlogHealth: {
    totalItems: number;
    totalEffort: number;
    estimatedWeeks: number | null;
    trend: "growing" | "shrinking" | "stable";
  };
  keyProjects: Array<{
    id: string;
    title: string;
    status: string;
    percentComplete: number;
    dueDate?: string | null;
    assignedTo?: { id: string; name: string } | null;
    tracking: "on_track" | "behind" | "at_risk" | "blocked";
    riskFlags?: Array<{ riskType: string; label: string }>;
  }>;
  weeklyThroughput: Array<{ week: string; points: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    timestamp: string;
    user: { name: string; avatarColor: string };
    task: { id: string; title: string };
  }>;
}

function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-border bg-card animate-pulse ${className}`}
    />
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();

  const isManager = user?.role === "manager";

  useEffect(() => {
    if (user && !isManager) {
      router.replace("/tasks");
    }
  }, [user, isManager, router]);

  const { data, isLoading } = useSWR<DashboardData>(
    isManager ? "/api/dashboard" : null
  );

  // While user context hasn't loaded or user is being redirected, show nothing
  if (!user || !isManager) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Team overview &amp; health metrics
          </p>
        </div>

        {/* Top row: Workload (2/3) + Backlog Health (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {isLoading || !data ? (
              <SkeletonCard className="h-64" />
            ) : (
              <WorkloadChart data={data.workload} />
            )}
          </div>
          <div>
            {isLoading || !data ? (
              <SkeletonCard className="h-64" />
            ) : (
              <BacklogHealth data={data.backlogHealth} />
            )}
          </div>
        </div>

        {/* Key Projects row */}
        <div>
          {isLoading || !data ? (
            <SkeletonCard className="h-48" />
          ) : (
            <KeyProjects projects={data.keyProjects} />
          )}
        </div>

        {/* Middle row: At-Risk (left) + Throughput (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            {isLoading || !data ? (
              <SkeletonCard className="h-72" />
            ) : (
              <AtRiskList tasks={data.atRisk} />
            )}
          </div>
          <div>
            {isLoading || !data ? (
              <SkeletonCard className="h-72" />
            ) : (
              <ThroughputChart data={data.weeklyThroughput} />
            )}
          </div>
        </div>

        {/* Bottom row: Activity feed (full width) */}
        <div>
          {isLoading || !data ? (
            <SkeletonCard className="h-48" />
          ) : (
            <ActivityFeed entries={data.recentActivity} />
          )}
        </div>
      </div>
    </div>
  );
}
