"use client";

import { Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sparkline } from "@/components/reports/sparkline";

interface PersonRow {
  user: { id: string; name: string };
  tasksCompleted: number;
  pointsEarned: number;
  boulderAllocation?: number;
  weekly?: number[];
}

interface ContributionTableProps {
  data: PersonRow[] | null;
  isManager: boolean;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ContributionTable({ data, isManager }: ContributionTableProps) {
  if (!isManager) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="flex items-center justify-center gap-3 py-10 text-center">
          <Users className="size-5 text-zinc-500 shrink-0" />
          <p className="text-sm text-zinc-400">
            Team summary view — per-person details available to managers.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...(data ?? [])].sort(
    (a, b) => b.tasksCompleted - a.tasksCompleted
  );

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-zinc-100 tracking-wide uppercase">
          Contribution by Person
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {sorted.length === 0 ? (
          <p className="text-sm text-zinc-500 text-center py-10">
            No data for this period.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400 pl-4">Name</TableHead>
                <TableHead className="text-zinc-400 text-right">
                  Tasks Completed
                </TableHead>
                <TableHead className="text-zinc-400 text-right">
                  Points Earned
                </TableHead>
                <TableHead className="text-zinc-400 text-right">
                  Boulder %
                </TableHead>
                <TableHead className="text-zinc-400 text-center pr-4">
                  Velocity (8w)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row, i) => (
                <TableRow
                  key={row.user.id}
                  className="border-zinc-800 hover:bg-zinc-800/40"
                >
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-600 tabular-nums w-4">
                        {i + 1}
                      </span>
                      <Avatar className="size-6 shrink-0">
                        <AvatarFallback className="text-[10px] font-bold text-white bg-zinc-700">
                          {getInitials(row.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-zinc-200 font-medium">
                        {row.user.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-zinc-200">
                    {row.tasksCompleted}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <span className="text-amber-400 font-semibold">
                        {row.pointsEarned}
                      </span>
                      <span className="text-zinc-600 text-xs">pts</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(row.boulderAllocation ?? 0) > 0 ? (
                      <span className="text-purple-400 font-semibold">{row.boulderAllocation}%</span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center pr-4">
                    <div className="flex justify-center">
                      <Sparkline data={row.weekly ?? []} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
