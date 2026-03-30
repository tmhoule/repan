"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Printer } from "lucide-react";
import { useUser } from "@/components/user-context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReportSummary } from "@/components/reports/report-summary";
import { ThroughputTrend } from "@/components/reports/throughput-trend";
import { CycleTimeCard } from "@/components/reports/cycle-time-card";
import { EstimationAccuracyCard } from "@/components/reports/estimation-accuracy-card";
import { BlockerStatsCard } from "@/components/reports/blocker-stats-card";
import { BucketDistributionCard } from "@/components/reports/bucket-distribution-card";
import { ContributionTable } from "@/components/reports/contribution-table";

interface ReportData {
  summary: {
    tasksCompleted: number;
    tasksCreated: number;
    backlogSize: number;
    backlogDelta: number;
    missedDeadlines: number;
    staleTasks?: number;
    behindScheduleTasks?: number;
    period: string;
    prevTasksCompleted?: number;
    prevTasksCreated?: number;
    prevMissedDeadlines?: number;
  };
  perPerson: Array<{
    user: { id: string; name: string };
    tasksCompleted: number;
    pointsEarned: number;
    weekly?: number[];
  }> | null;
  weeklyThroughput: Array<{ week: string; points: number }>;
  cycleTime?: Record<string, { avg: number | null; count: number }>;
  estimationAccuracy?: {
    small: { avgDays: number | null; count: number };
    medium: { avgDays: number | null; count: number; ratioToSmall: number | null };
    large: { avgDays: number | null; count: number; ratioToSmall: number | null };
  };
  blockerStats?: {
    count: number;
    avgDays: number | null;
    maxDays: number | null;
    currentlyBlocked: number;
  };
  bucketData?: Array<{
    name: string;
    colorKey: string | null;
    count: number;
  }>;
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900 animate-pulse ${className}`}
    />
  );
}

export default function ReportsPage() {
  const { user } = useUser();
  const router = useRouter();
  const isManager = user?.role === "manager";

  useEffect(() => {
    if (user === null) {
      router.replace("/login");
    }
  }, [user, router]);

  const { data: weeklyData, isLoading: weeklyLoading } = useSWR<ReportData>(
    user ? "/api/reports?period=weekly" : null
  );
  const { data: monthlyData, isLoading: monthlyLoading } = useSWR<ReportData>(
    user ? "/api/reports?period=monthly" : null
  );

  if (!user) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print\\:grid-cols-5 { grid-template-columns: repeat(5, minmax(0, 1fr)); }
          .print\\:gap-3 { gap: 0.75rem; }
          [data-slot="card"] { background: white !important; border: 1px solid #e5e7eb !important; }
          [data-slot="card-title"], .text-zinc-100 { color: #111827 !important; }
          .text-zinc-400, .text-zinc-500 { color: #6b7280 !important; }
          .text-zinc-200, .text-zinc-300 { color: #374151 !important; }
          .bg-zinc-900, .bg-zinc-950 { background: white !important; }
          .border-zinc-800 { border-color: #e5e7eb !important; }
          [data-slot="tabs-list"] { display: none !important; }
          [data-slot="tabs-content"] { display: block !important; }
        }
      `}</style>

      <div className="min-h-screen bg-zinc-950 px-4 py-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Page header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                Reports
              </h1>
              <p className="text-sm text-zinc-500 mt-0.5">
                Team performance metrics and contribution summary
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="no-print shrink-0"
            >
              <Printer className="size-3.5" />
              Print / PDF
            </Button>
          </div>

          {/* Period tabs */}
          <Tabs defaultValue="weekly">
            <TabsList className="no-print">
              <TabsTrigger value="weekly">Weekly</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>

            {/* Weekly */}
            <TabsContent value="weekly" className="space-y-6 mt-4">
              {weeklyLoading || !weeklyData ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonBlock key={i} className="h-28" />
                    ))}
                  </div>
                  <SkeletonBlock className="h-64" />
                  <SkeletonBlock className="h-48" />
                </>
              ) : (
                <>
                  <ReportSummary data={weeklyData.summary} />
                  <ThroughputTrend
                    data={weeklyData.weeklyThroughput}
                    period="weekly"
                  />
                  <CycleTimeCard data={weeklyData.cycleTime} />
                  <EstimationAccuracyCard data={weeklyData.estimationAccuracy} />
                  <BlockerStatsCard data={weeklyData.blockerStats} />
                  <BucketDistributionCard data={weeklyData.bucketData} />
                  <ContributionTable
                    data={weeklyData.perPerson}
                    isManager={isManager}
                  />
                </>
              )}
            </TabsContent>

            {/* Monthly */}
            <TabsContent value="monthly" className="space-y-6 mt-4">
              {monthlyLoading || !monthlyData ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonBlock key={i} className="h-28" />
                    ))}
                  </div>
                  <SkeletonBlock className="h-64" />
                  <SkeletonBlock className="h-48" />
                </>
              ) : (
                <>
                  <ReportSummary data={monthlyData.summary} />
                  <ThroughputTrend
                    data={monthlyData.weeklyThroughput}
                    period="monthly"
                  />
                  <CycleTimeCard data={monthlyData.cycleTime} />
                  <EstimationAccuracyCard data={monthlyData.estimationAccuracy} />
                  <BlockerStatsCard data={monthlyData.blockerStats} />
                  <BucketDistributionCard data={monthlyData.bucketData} />
                  <ContributionTable
                    data={monthlyData.perPerson}
                    isManager={isManager}
                  />
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
