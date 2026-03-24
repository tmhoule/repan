"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { UserPlus, PlusCircle, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { useUser } from "@/components/user-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { UserForm } from "@/components/admin/user-form";
import { BadgeForm } from "@/components/admin/badge-form";

interface UserRow {
  id: string;
  name: string;
  role: "manager" | "staff";
  avatarColor: string;
  isActive: boolean;
  createdAt: string;
}

interface AwardRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteriaType: string;
  criteriaValue: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function criteriaLabel(type: string, value: Record<string, unknown>): string {
  switch (type) {
    case "count_action":
      return `${value.count ?? "?"} × ${value.action ?? "?"}`;
    case "streak_milestone":
      return `${value.count ?? "?"}-day ${value.streakType ?? "streak"}`;
    case "consecutive_action":
      return `${value.days ?? "?"} consecutive days of ${value.action ?? "?"}`;
    case "single_day_count":
      return `${value.count ?? "?"} × ${value.action ?? "?"} in one day`;
    case "total_points":
      return `${value.points ?? "?"} total points`;
    default:
      return type;
  }
}

export default function AdminPage() {
  const { user } = useUser();
  const router = useRouter();
  const isManager = user?.role === "manager";

  useEffect(() => {
    if (user && !isManager) {
      router.replace("/tasks");
    }
  }, [user, isManager, router]);

  // Users state
  const {
    data: users,
    isLoading: usersLoading,
    mutate: mutateUsers,
  } = useSWR<UserRow[]>(
    isManager ? "/api/users?includeInactive=true" : null
  );

  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);

  // Awards state
  const {
    data: awards,
    isLoading: awardsLoading,
    mutate: mutateAwards,
  } = useSWR<AwardRow[]>(
    isManager ? "/api/awards?includeInactive=true" : null
  );

  const [badgeFormOpen, setBadgeFormOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<AwardRow | null>(null);

  if (!user || !isManager) return null;

  const openCreateUser = () => {
    setEditingUser(null);
    setUserFormOpen(true);
  };

  const openEditUser = (u: UserRow) => {
    setEditingUser(u);
    setUserFormOpen(true);
  };

  const openCreateBadge = () => {
    setEditingBadge(null);
    setBadgeFormOpen(true);
  };

  const openEditBadge = (a: AwardRow) => {
    setEditingBadge(a);
    setBadgeFormOpen(true);
  };

  const handleRetireBadge = async (id: string, currentlyActive: boolean) => {
    await fetch(`/api/awards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !currentlyActive }),
    });
    mutateAwards();
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Admin Panel
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage users and badge definitions
          </p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
          </TabsList>

          {/* ── Users Tab ── */}
          <TabsContent value="users" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                  {usersLoading
                    ? "Loading..."
                    : `${(users ?? []).length} user${(users ?? []).length !== 1 ? "s" : ""}`}
                </p>
                <Button size="sm" onClick={openCreateUser}>
                  <UserPlus className="size-3.5" />
                  Create User
                </Button>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                {usersLoading ? (
                  <div className="space-y-px p-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-11 rounded-lg bg-zinc-800/50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (users ?? []).length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-12">
                    No users found.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-400 pl-4">Name</TableHead>
                        <TableHead className="text-zinc-400">Role</TableHead>
                        <TableHead className="text-zinc-400">Status</TableHead>
                        <TableHead className="text-zinc-400">Created</TableHead>
                        <TableHead className="text-zinc-400 text-right pr-4">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(users ?? []).map((u) => (
                        <TableRow
                          key={u.id}
                          className="border-zinc-800 hover:bg-zinc-800/40"
                        >
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-6 rounded-full shrink-0"
                                style={{ backgroundColor: u.avatarColor }}
                              />
                              <span className="text-sm text-zinc-200 font-medium">
                                {u.name}
                              </span>
                              {u.id === user?.id && (
                                <Badge variant="secondary" className="text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={u.role === "manager" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs font-medium ${
                                u.isActive
                                  ? "text-emerald-500"
                                  : "text-zinc-500"
                              }`}
                            >
                              {u.isActive ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="text-zinc-400 text-xs">
                            {formatDate(u.createdAt)}
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => openEditUser(u)}
                              aria-label={`Edit ${u.name}`}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ── Badges Tab ── */}
          <TabsContent value="badges" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">
                  {awardsLoading
                    ? "Loading..."
                    : `${(awards ?? []).length} badge${(awards ?? []).length !== 1 ? "s" : ""}`}
                </p>
                <Button size="sm" onClick={openCreateBadge}>
                  <PlusCircle className="size-3.5" />
                  Create Badge
                </Button>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                {awardsLoading ? (
                  <div className="space-y-px p-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-11 rounded-lg bg-zinc-800/50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (awards ?? []).length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-12">
                    No badges found.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-400 pl-4">Badge</TableHead>
                        <TableHead className="text-zinc-400 hidden sm:table-cell">
                          Description
                        </TableHead>
                        <TableHead className="text-zinc-400 hidden md:table-cell">
                          Criteria
                        </TableHead>
                        <TableHead className="text-zinc-400">Status</TableHead>
                        <TableHead className="text-zinc-400 text-right pr-4">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(awards ?? []).map((a) => (
                        <TableRow
                          key={a.id}
                          className="border-zinc-800 hover:bg-zinc-800/40"
                        >
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="text-lg leading-none"
                                role="img"
                                aria-hidden="true"
                              >
                                {a.icon}
                              </span>
                              <span className="text-sm text-zinc-200 font-medium">
                                {a.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-400 text-xs max-w-[200px] truncate hidden sm:table-cell">
                            {a.description}
                          </TableCell>
                          <TableCell className="text-zinc-400 text-xs hidden md:table-cell">
                            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5">
                              {criteriaLabel(a.criteriaType, a.criteriaValue)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs font-medium ${
                                a.isActive
                                  ? "text-emerald-500"
                                  : "text-zinc-500"
                              }`}
                            >
                              {a.isActive ? "Active" : "Retired"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openEditBadge(a)}
                                aria-label={`Edit ${a.name}`}
                              >
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() =>
                                  handleRetireBadge(a.id, a.isActive)
                                }
                                aria-label={
                                  a.isActive
                                    ? `Retire ${a.name}`
                                    : `Restore ${a.name}`
                                }
                                title={a.isActive ? "Retire" : "Restore"}
                              >
                                {a.isActive ? (
                                  <Archive className="size-3.5" />
                                ) : (
                                  <ArchiveRestore className="size-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* User form dialog */}
      <UserForm
        open={userFormOpen}
        onClose={() => setUserFormOpen(false)}
        onSave={() => mutateUsers()}
        initialData={editingUser}
      />

      {/* Badge form dialog */}
      <BadgeForm
        open={badgeFormOpen}
        onClose={() => setBadgeFormOpen(false)}
        onSave={() => mutateAwards()}
        initialData={
          editingBadge
            ? {
                id: editingBadge.id,
                name: editingBadge.name,
                description: editingBadge.description,
                icon: editingBadge.icon,
                criteriaType: editingBadge.criteriaType as
                  | "count_action"
                  | "streak_milestone"
                  | "consecutive_action"
                  | "single_day_count"
                  | "total_points",
                criteriaValue: editingBadge.criteriaValue,
                isActive: editingBadge.isActive,
              }
            : null
        }
      />
    </div>
  );
}
