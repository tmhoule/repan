"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useUser } from "@/components/user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, AlertTriangle, Inbox, Activity, Users } from "lucide-react";

interface TeamOverview {
  id: string;
  name: string;
  memberCount: number;
  wipCount: number;
  atRiskCount: number;
  blockedCount: number;
  backlogCount: number;
  avgThroughput: number;
  weeklyPoints: number[];
  health: "green" | "yellow" | "red";
}

function MiniSparkline({ data, color = "#8B5CF6" }: { data: number[]; color?: string }) {
  if (data.length === 0 || data.every((d) => d === 0)) return null;
  const max = Math.max(...data, 1);
  const w = 64;
  const h = 20;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HealthDot({ health }: { health: "green" | "yellow" | "red" }) {
  const color = health === "green" ? "bg-emerald-400" : health === "yellow" ? "bg-amber-400" : "bg-red-400";
  return <span className={`inline-block size-2.5 rounded-full ${color}`} />;
}

function Stat({ icon, value, label, highlight }: { icon: React.ReactNode; value: string | number; label: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{icon}</span>
      <span className={`text-sm font-semibold tabular-nums ${highlight ? "text-amber-400" : "text-foreground"}`}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function TeamCard({ team }: { team: TeamOverview }) {
  return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <HealthDot health={team.health} />
              {team.name}
            </CardTitle>
            <span className="text-xs text-muted-foreground">{team.memberCount} members</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <Stat icon={<Layers className="size-3.5" />} value={team.wipCount} label="WIP" highlight={team.wipCount > team.memberCount * 3} />
              <Stat icon={<AlertTriangle className="size-3.5" />} value={team.atRiskCount} label="at risk" highlight={team.atRiskCount > 0} />
              <Stat icon={<Inbox className="size-3.5" />} value={team.backlogCount} label="backlog" />
              <Stat icon={<Activity className="size-3.5" />} value={team.avgThroughput} label="pts/wk" />
            </div>
            <MiniSparkline data={team.weeklyPoints} />
          </div>
        </CardContent>
      </Card>
  );
}

export default function TeamsOverviewPage() {
  const { user } = useUser();
  const router = useRouter();
  const isManager = user?.role === "manager";

  useEffect(() => {
    if (user && !isManager) {
      router.replace("/tasks");
    }
  }, [user, isManager, router]);

  const { data, isLoading } = useSWR<{ teams: TeamOverview[] }>(
    isManager ? "/api/teams/overview" : null
  );

  if (!user || !isManager) return null;

  const teams = data?.teams ?? [];
  const sortedTeams = [...teams].sort((a, b) => {
    const healthOrder = { red: 0, yellow: 1, green: 2 };
    return healthOrder[a.health] - healthOrder[b.health];
  });

  return (
    <div className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Teams Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading ? "Loading..." : `${teams.length} team${teams.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
            <Users className="size-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No teams found. You need manager access to at least one team.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTeams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
