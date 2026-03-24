"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { UserPlus, PlusCircle, Pencil, Archive, ArchiveRestore, Users, Trash2, Plus } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { UserForm } from "@/components/admin/user-form";
import { BadgeForm } from "@/components/admin/badge-form";
import { resolveIcon } from "@/lib/badge-icons";

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

interface TeamRow {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  role: "manager" | "member";
  user: { id: string; name: string; avatarColor: string; role: string; isActive: boolean };
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
      return `${value.count ?? value.days ?? "?"} consecutive days of ${value.action ?? "?"}`;
    case "single_day_count":
      return `${value.count ?? "?"} × ${value.action ?? "?"} in one day`;
    case "total_points":
      return `${value.count ?? value.points ?? "?"} total points`;
    default:
      return type;
  }
}

export default function AdminPage() {
  const { user } = useUser();
  const router = useRouter();
  const isManager = user?.role === "manager";
  const isSuperAdmin = user?.isSuperAdmin === true;

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

  // Teams state
  const {
    data: teams,
    isLoading: teamsLoading,
    mutate: mutateTeams,
  } = useSWR<TeamRow[]>(
    isManager ? "/api/teams" : null
  );

  const [createTeamOpen, setCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  const [managingTeam, setManagingTeam] = useState<TeamRow | null>(null);
  const {
    data: teamMembers,
    isLoading: teamMembersLoading,
    mutate: mutateTeamMembers,
  } = useSWR<TeamMember[]>(
    managingTeam ? `/api/teams/${managingTeam.id}/members` : null
  );

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addMemberRole, setAddMemberRole] = useState<"manager" | "member">("member");
  const [addingMember, setAddingMember] = useState(false);

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

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    try {
      await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTeamName.trim() }),
      });
      setNewTeamName("");
      setCreateTeamOpen(false);
      mutateTeams();
    } finally {
      setCreatingTeam(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!managingTeam) return;
    await fetch(`/api/teams/${managingTeam.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    mutateTeamMembers();
    mutateTeams();
  };

  const handleAddMember = async () => {
    if (!managingTeam || !addMemberUserId) return;
    setAddingMember(true);
    try {
      await fetch(`/api/teams/${managingTeam.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: addMemberUserId, role: addMemberRole }),
      });
      setAddMemberUserId("");
      setAddMemberRole("member");
      setAddMemberOpen(false);
      mutateTeamMembers();
      mutateTeams();
    } finally {
      setAddingMember(false);
    }
  };

  // Users not in the team (for add member dialog)
  const nonMembers = (users ?? []).filter(
    (u) => u.isActive && !(teamMembers ?? []).some((m) => m.userId === u.id)
  );

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Admin Panel
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage users, teams and badge definitions
          </p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
            {isManager && <TabsTrigger value="teams">Teams</TabsTrigger>}
            <TabsTrigger value="settings">Settings</TabsTrigger>
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
                  Add User
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

          {/* ── Settings Tab ── */}
          <TabsContent value="settings" className="mt-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="text-sm font-semibold text-zinc-200 mb-1">
                System Settings
              </h2>
              <p className="text-sm text-zinc-500">
                System settings coming soon. Future options: app name, default
                effort estimates, point values.
              </p>
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
                                {resolveIcon(a.icon)}
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

          {/* ── Teams Tab ── */}
          <TabsContent value="teams" className="mt-4">
            {managingTeam ? (
              // Team member management view
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setManagingTeam(null)}
                    className="text-zinc-400"
                  >
                    ← Back to Teams
                  </Button>
                  <h2 className="text-sm font-semibold text-zinc-200">
                    {managingTeam.name}
                  </h2>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">
                    {teamMembersLoading
                      ? "Loading..."
                      : `${(teamMembers ?? []).length} member${(teamMembers ?? []).length !== 1 ? "s" : ""}`}
                  </p>
                  <Button size="sm" onClick={() => setAddMemberOpen(true)}>
                    <Plus className="size-3.5" />
                    Add Member
                  </Button>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                  {teamMembersLoading ? (
                    <div className="space-y-px p-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-11 rounded-lg bg-zinc-800/50 animate-pulse" />
                      ))}
                    </div>
                  ) : (teamMembers ?? []).length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-12">No members yet.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                          <TableHead className="text-zinc-400 pl-4">Member</TableHead>
                          <TableHead className="text-zinc-400">Team Role</TableHead>
                          <TableHead className="text-zinc-400 text-right pr-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(teamMembers ?? []).map((m) => (
                          <TableRow key={m.id} className="border-zinc-800 hover:bg-zinc-800/40">
                            <TableCell className="pl-4">
                              <div className="flex items-center gap-2">
                                <span
                                  className="size-6 rounded-full shrink-0"
                                  style={{ backgroundColor: m.user.avatarColor }}
                                />
                                <span className="text-sm text-zinc-200 font-medium">{m.user.name}</span>
                                {m.userId === user?.id && (
                                  <Badge variant="secondary" className="text-xs">You</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={m.role === "manager" ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {m.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleRemoveMember(m.userId)}
                                aria-label={`Remove ${m.user.name}`}
                                title="Remove from team"
                              >
                                <Trash2 className="size-3.5 text-red-400" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            ) : (
              // Teams list view
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-400">
                    {teamsLoading
                      ? "Loading..."
                      : `${(teams ?? []).length} team${(teams ?? []).length !== 1 ? "s" : ""}`}
                  </p>
                  {isSuperAdmin && (
                    <Button size="sm" onClick={() => setCreateTeamOpen(true)}>
                      <Plus className="size-3.5" />
                      Create Team
                    </Button>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                  {teamsLoading ? (
                    <div className="space-y-px p-1">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-11 rounded-lg bg-zinc-800/50 animate-pulse" />
                      ))}
                    </div>
                  ) : (teams ?? []).length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-12">No teams found.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-zinc-800 hover:bg-transparent">
                          <TableHead className="text-zinc-400 pl-4">Team</TableHead>
                          <TableHead className="text-zinc-400">Members</TableHead>
                          <TableHead className="text-zinc-400">Created</TableHead>
                          <TableHead className="text-zinc-400 text-right pr-4">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(teams ?? []).map((t) => (
                          <TableRow key={t.id} className="border-zinc-800 hover:bg-zinc-800/40">
                            <TableCell className="pl-4">
                              <EditableTeamName teamId={t.id} name={t.name} onSave={() => mutateTeams()} />
                            </TableCell>
                            <TableCell className="text-zinc-400 text-sm">
                              {t.memberCount}
                            </TableCell>
                            <TableCell className="text-zinc-400 text-xs">
                              {formatDate(t.createdAt)}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setManagingTeam(t)}
                                className="text-xs"
                              >
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>
            )}
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

      {/* Create team dialog */}
      <Dialog open={createTeamOpen} onOpenChange={setCreateTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Team name"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateTeam(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateTeamOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTeam} disabled={creatingTeam || !newTeamName.trim()}>
              {creatingTeam ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add member dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member to {managingTeam?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">User</label>
              <select
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 text-zinc-100 px-3 py-2 text-sm"
                value={addMemberUserId}
                onChange={(e) => setAddMemberUserId(e.target.value)}
              >
                <option value="">Select a user...</option>
                {nonMembers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-1 block">Role</label>
              <select
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 text-zinc-100 px-3 py-2 text-sm"
                value={addMemberRole}
                onChange={(e) => setAddMemberRole(e.target.value as "manager" | "member")}
              >
                <option value="member">Member</option>
                <option value="manager">Manager</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddMemberOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMember} disabled={addingMember || !addMemberUserId}>
              {addingMember ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditableTeamName({ teamId, name, onSave }: { teamId: string; name: string; onSave: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim() || value.trim() === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: value.trim() }),
      });
      if (res.ok) {
        onSave();
        setEditing(false);
      }
    } catch {
      setValue(name);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted-foreground shrink-0" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") { setEditing(false); setValue(name); }
          }}
          className="h-7 text-sm"
          autoFocus
          disabled={saving}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 group">
      <Users className="size-4 text-muted-foreground" />
      <span
        className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
        onClick={() => setEditing(true)}
        title="Click to rename"
      >
        {name}
      </span>
      <Pencil
        className="size-3 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all cursor-pointer"
        onClick={() => setEditing(true)}
      />
    </div>
  );
}
