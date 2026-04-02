"use client";

import { useEffect, useState } from "react";
import { csrfFetch } from "@/lib/csrf-client";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { UserPlus, PlusCircle, Pencil, Archive, ArchiveRestore, Users, Trash2, Plus, Palette, Key } from "lucide-react";
import { TeamIcon } from "@/lib/team-icons";
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
import { cn } from "@/lib/utils";
import { BUCKET_COLORS, VALID_COLOR_KEYS, type BucketColorKey, isValidColorKey } from "@/lib/bucket-colors";
import { toast } from "sonner";

interface UserRow {
  id: string;
  name: string;
  role: "manager" | "staff";
  avatarColor: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  teams?: { id: string; name: string }[];
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
    isManager ? "/api/users?includeInactive=true&allTeams=true" : null
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

  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  const [deletingTeam, setDeletingTeam] = useState(false);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addMemberRole, setAddMemberRole] = useState<"manager" | "member">("member");
  const [addingMember, setAddingMember] = useState(false);

  // Buckets state
  const {
    data: bucketsData,
    mutate: mutateBuckets,
  } = useSWR<{ buckets: { id: string; name: string; colorKey: string; displayOrder: number; _count?: { tasks: number } }[]; teamId: string }>(
    isManager ? "/api/buckets" : null
  );
  const buckets = bucketsData?.buckets ?? [];
  const activeTeamId = bucketsData?.teamId;

  const [newBucketName, setNewBucketName] = useState("");
  const [newBucketColor, setNewBucketColor] = useState<BucketColorKey>("blue");
  const [addingBucket, setAddingBucket] = useState(false);
  const [editingBucketId, setEditingBucketId] = useState<string | null>(null);
  const [editBucketName, setEditBucketName] = useState("");
  const [editBucketColor, setEditBucketColor] = useState<BucketColorKey>("blue");

  // Priority weights state
  const [weightHigh, setWeightHigh] = useState(60);
  const [weightMedium, setWeightMedium] = useState(35);
  const [weightLow, setWeightLow] = useState(10);
  const [multiplierBlocked, setMultiplierBlocked] = useState(5);
  const [multiplierStalled, setMultiplierStalled] = useState(25);
  const [savingWeights, setSavingWeights] = useState(false);

  // SSO state
  const {
    data: ssoConfig,
    isLoading: ssoLoading,
    mutate: mutateSso,
  } = useSWR<{
    configured: boolean;
    enabled?: boolean;
    appUrl?: string;
    idpEntityId?: string;
    idpSsoUrl?: string;
    spEntityId?: string;
    attrUid?: string;
    attrDisplayName?: string;
    acsUrl?: string;
    hasCertificate?: boolean;
  }>(isSuperAdmin ? "/api/admin/saml" : null);

  const [ssoAppUrl, setSsoAppUrl] = useState("");
  const [ssoConfigMode, setSsoConfigMode] = useState<"metadata" | "manual">("metadata");
  const [ssoMetadataUrl, setSsoMetadataUrl] = useState("");
  const [ssoIdpEntityId, setSsoIdpEntityId] = useState("");
  const [ssoIdpSsoUrl, setSsoIdpSsoUrl] = useState("");
  const [ssoIdpCertificate, setSsoIdpCertificate] = useState("");
  const [ssoAttrUid, setSsoAttrUid] = useState("uid");
  const [ssoAttrDisplayName, setSsoAttrDisplayName] = useState("displayName");
  const [savingSso, setSavingSso] = useState(false);
  const [ssoError, setSsoError] = useState("");
  const [ssoSuccess, setSsoSuccess] = useState("");
  const [togglingSso, setTogglingSso] = useState(false);

  // Session secret state
  const {
    data: sessionSecretData,
    isLoading: sessionSecretLoading,
    mutate: mutateSessionSecret,
  } = useSWR<{
    configured: boolean;
    lastUpdated: string | null;
  }>(isSuperAdmin ? "/api/admin/session-secret" : null);

  const [generatingSecret, setGeneratingSecret] = useState(false);
  const [secretSuccess, setSecretSuccess] = useState("");
  const [secretError, setSecretError] = useState("");

  // Sync SSO form fields from loaded config
  useEffect(() => {
    if (ssoConfig?.configured) {
      setSsoAppUrl(ssoConfig.appUrl ?? "");
      setSsoAttrUid(ssoConfig.attrUid ?? "uid");
      setSsoAttrDisplayName(ssoConfig.attrDisplayName ?? "displayName");
    }
  }, [ssoConfig]);

  // Load team priority weights
  const { data: teamWeights, mutate: mutateWeights } = useSWR<{ weightHigh: number; weightMedium: number; weightLow: number; multiplierBlocked: number; multiplierStalled: number }>(
    activeTeamId ? `/api/teams/${activeTeamId}` : null
  );

  useEffect(() => {
    if (teamWeights) {
      setWeightHigh(teamWeights.weightHigh);
      setWeightMedium(teamWeights.weightMedium);
      setWeightLow(teamWeights.weightLow);
      setMultiplierBlocked(teamWeights.multiplierBlocked);
      setMultiplierStalled(teamWeights.multiplierStalled);
    }
  }, [teamWeights]);

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
    await csrfFetch(`/api/awards/${id}`, {
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
      await csrfFetch("/api/teams", {
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

  const handleDeleteTeam = async () => {
    if (!deleteTeamId) return;
    setDeletingTeam(true);
    try {
      const res = await csrfFetch(`/api/teams/${deleteTeamId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Failed to delete team. It may still have tasks assigned to it.");
        return;
      }
      setDeleteTeamId(null);
      mutateTeams();
    } finally {
      setDeletingTeam(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!managingTeam) return;
    await csrfFetch(`/api/teams/${managingTeam.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    mutateTeamMembers();
    mutateTeams();
    mutateUsers();
  };

  const handleAddMember = async () => {
    if (!managingTeam || !addMemberUserId) return;
    setAddingMember(true);
    try {
      await csrfFetch(`/api/teams/${managingTeam.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: addMemberUserId, role: addMemberRole }),
      });
      setAddMemberUserId("");
      setAddMemberRole("member");
      setAddMemberOpen(false);
      mutateTeamMembers();
      mutateTeams();
      mutateUsers();
    } finally {
      setAddingMember(false);
    }
  };

  const handleAddBucket = async () => {
    if (!newBucketName.trim() || !activeTeamId) return;
    setAddingBucket(true);
    try {
      const res = await csrfFetch(`/api/teams/${activeTeamId}/buckets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBucketName.trim(), colorKey: newBucketColor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create bucket");
      }
      setNewBucketName("");
      setNewBucketColor("blue");
      mutateBuckets();
      toast.success("Bucket created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create bucket");
    } finally {
      setAddingBucket(false);
    }
  };

  const startEditBucket = (b: { id: string; name: string; colorKey: string }) => {
    setEditingBucketId(b.id);
    setEditBucketName(b.name);
    setEditBucketColor(b.colorKey as BucketColorKey);
  };

  const handleSaveBucket = async (bucketId: string) => {
    if (!editBucketName.trim() || !activeTeamId) return;
    try {
      const res = await csrfFetch(`/api/teams/${activeTeamId}/buckets/${bucketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editBucketName.trim(), colorKey: editBucketColor }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to update bucket");
      }
      setEditingBucketId(null);
      mutateBuckets();
      toast.success("Bucket updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update bucket");
    }
  };

  const handleDeleteBucket = async (bucket: { id: string; name: string }) => {
    if (!confirm(`Delete "${bucket.name}"? Tasks in this bucket will become uncategorized.`)) return;
    if (!activeTeamId) return;
    try {
      const res = await csrfFetch(`/api/teams/${activeTeamId}/buckets/${bucket.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      mutateBuckets();
      toast.success("Bucket deleted");
    } catch {
      toast.error("Failed to delete bucket");
    }
  };

  const handleSaveWeights = async () => {
    if (!activeTeamId) return;
    setSavingWeights(true);
    try {
      const res = await csrfFetch(`/api/teams/${activeTeamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightHigh, weightMedium, weightLow, multiplierBlocked, multiplierStalled }),
      });
      if (!res.ok) {
        toast.error("Failed to save priority weights");
        return;
      }
      mutateWeights();
      toast.success("Priority weights saved");
    } catch {
      toast.error("Failed to save priority weights");
    } finally {
      setSavingWeights(false);
    }
  };

  const handleSaveSso = async () => {
    if (!ssoAppUrl.trim()) return;
    if (ssoConfigMode === "metadata" && !ssoMetadataUrl.trim()) return;
    if (ssoConfigMode === "manual" && (!ssoIdpEntityId.trim() || !ssoIdpSsoUrl.trim() || !ssoIdpCertificate.trim())) return;
    setSavingSso(true);
    setSsoError("");
    setSsoSuccess("");
    try {
      const payload: Record<string, string> = {
        appUrl: ssoAppUrl.trim(),
        attrUid: ssoAttrUid.trim() || "uid",
        attrDisplayName: ssoAttrDisplayName.trim() || "displayName",
      };
      if (ssoConfigMode === "metadata") {
        payload.metadataUrl = ssoMetadataUrl.trim();
      } else {
        payload.idpEntityId = ssoIdpEntityId.trim();
        payload.idpSsoUrl = ssoIdpSsoUrl.trim();
        payload.idpCertificate = ssoIdpCertificate.trim();
      }
      const res = await csrfFetch("/api/admin/saml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save SSO config");
      setSsoSuccess("SSO configuration saved successfully");
      setSsoMetadataUrl("");
      mutateSso();
    } catch (err) {
      setSsoError(err instanceof Error ? err.message : "Failed to save SSO config");
    } finally {
      setSavingSso(false);
    }
  };

  const handleToggleSso = async () => {
    setTogglingSso(true);
    setSsoError("");
    try {
      const res = await csrfFetch("/api/admin/saml", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !ssoConfig?.enabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to toggle SSO");
      }
      mutateSso();
    } catch (err) {
      setSsoError(err instanceof Error ? err.message : "Failed to toggle SSO");
    } finally {
      setTogglingSso(false);
    }
  };

  const handleGenerateSessionSecret = async () => {
    if (!confirm("Generate a new session secret? This will invalidate all existing user sessions and require everyone to log in again.")) {
      return;
    }
    setGeneratingSecret(true);
    setSecretError("");
    setSecretSuccess("");
    try {
      const res = await csrfFetch("/api/admin/session-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate session secret");
      setSecretSuccess(data.message);
      mutateSessionSecret();
      toast.success("Session secret generated successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate session secret";
      setSecretError(message);
      toast.error(message);
    } finally {
      setGeneratingSecret(false);
    }
  };

  // Fetch ALL users (across all teams) for the add-member dialog
  const { data: allUsers } = useSWR<UserRow[]>(
    managingTeam ? "/api/users?includeInactive=true&allTeams=true" : null
  );

  // Users not in the team (for add member dialog)
  const nonMembers = (allUsers ?? []).filter(
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
            {isSuperAdmin && <TabsTrigger value="sso">SSO</TabsTrigger>}
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
                        <TableHead className="text-zinc-400">Team</TableHead>
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
                            <div className="flex items-center gap-1.5">
                              {(u.teams ?? []).map((t) => (
                                <span key={t.id} title={t.name}>
                                  <TeamIcon
                                    teamName={t.name}
                                    className="size-4 text-zinc-400"
                                  />
                                </span>
                              ))}
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
            <div className="space-y-6">
              {/* Buckets */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-200">Backlog Buckets</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Categorize backlog tasks by work area</p>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {buckets.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-6">
                      No buckets yet. Create one below.
                    </p>
                  ) : (
                    buckets.map((bucket) => {
                      const color = BUCKET_COLORS[bucket.colorKey as BucketColorKey];
                      const isEditing = editingBucketId === bucket.id;

                      if (isEditing) {
                        return (
                          <div key={bucket.id} className="rounded-lg border border-zinc-700 p-3 space-y-2">
                            <Input
                              value={editBucketName}
                              onChange={(e) => setEditBucketName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveBucket(bucket.id);
                                if (e.key === "Escape") setEditingBucketId(null);
                              }}
                              className="h-8 text-sm"
                              autoFocus
                            />
                            <div className="flex items-center gap-1.5">
                              {VALID_COLOR_KEYS.map((key) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setEditBucketColor(key)}
                                  className={cn(
                                    "size-6 rounded-full transition-all",
                                    BUCKET_COLORS[key].dotColor,
                                    editBucketColor === key
                                      ? "ring-2 ring-offset-2 ring-primary ring-offset-zinc-900"
                                      : "hover:scale-110"
                                  )}
                                  title={BUCKET_COLORS[key].label}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => handleSaveBucket(bucket.id)}>
                                Save
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingBucketId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={bucket.id} className="flex items-center gap-3 rounded-lg border border-zinc-800 px-3 py-2 hover:bg-zinc-800/40 transition-colors">
                          <span className={cn("size-3 rounded-full shrink-0", color?.dotColor ?? "bg-gray-400")} />
                          <button
                            onClick={() => startEditBucket(bucket)}
                            className="flex-1 text-left text-sm font-medium text-zinc-200 hover:text-primary transition-colors truncate"
                          >
                            {bucket.name}
                          </button>
                          {bucket._count && (
                            <span className="text-xs text-zinc-500 tabular-nums">
                              {bucket._count.tasks} task{bucket._count.tasks !== 1 ? "s" : ""}
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 shrink-0"
                            onClick={() => handleDeleteBucket(bucket)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      );
                    })
                  )}

                  {/* Add new bucket */}
                  <div className="pt-3 mt-2 border-t border-zinc-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={newBucketName}
                        onChange={(e) => setNewBucketName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleAddBucket(); }}
                        placeholder="New bucket name..."
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        size="sm"
                        variant="default"
                        className="h-8 gap-1 text-xs shrink-0"
                        onClick={handleAddBucket}
                        disabled={addingBucket || !newBucketName.trim()}
                      >
                        <Plus className="size-3.5" />
                        Add
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {VALID_COLOR_KEYS.map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setNewBucketColor(key)}
                          className={cn(
                            "size-6 rounded-full transition-all",
                            BUCKET_COLORS[key].dotColor,
                            newBucketColor === key
                              ? "ring-2 ring-offset-2 ring-primary ring-offset-zinc-900"
                              : "hover:scale-110"
                          )}
                          title={BUCKET_COLORS[key].label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* System Settings */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-800">
                  <h2 className="text-sm font-semibold text-zinc-200">System Settings</h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Configure how your team calculates workload</p>
                </div>

                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Task Priority Weights</h3>
                    <p className="text-xs text-zinc-500 mb-3">
                      Each active task contributes this percentage to a person&apos;s workload based on its priority.
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">High</label>
                        <Input
                          type="number"
                          min={1}
                          value={weightHigh}
                          onChange={(e) => setWeightHigh(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Medium</label>
                        <Input
                          type="number"
                          min={1}
                          value={weightMedium}
                          onChange={(e) => setWeightMedium(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Low</label>
                        <Input
                          type="number"
                          min={1}
                          value={weightLow}
                          onChange={(e) => setWeightLow(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-4 mt-4">
                    <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Status Multipliers</h3>
                    <p className="text-xs text-zinc-500 mb-3">
                      Blocked and stalled tasks contribute a reduced percentage of their normal priority weight to workload.
                      For example, a high-priority task at 60% weight with a 5% blocked multiplier counts as 3%.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Blocked (%)</label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={multiplierBlocked}
                          onChange={(e) => setMultiplierBlocked(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-zinc-400 mb-1">Stalled (%)</label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={multiplierStalled}
                          onChange={(e) => setMultiplierStalled(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <Button
                      size="sm"
                      onClick={handleSaveWeights}
                      disabled={savingWeights}
                      className="h-8 text-xs"
                    >
                      {savingWeights ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </div>
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
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setManagingTeam(t)}
                                  className="text-xs"
                                >
                                  Manage
                                </Button>
                                {isSuperAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                    onClick={() => setDeleteTeamId(t.id)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                )}
                              </div>
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

          {/* ── SSO Tab ── */}
          {isSuperAdmin && (
            <TabsContent value="sso" className="mt-4">
              <div className="space-y-6">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <h2 className="text-sm font-semibold text-zinc-200">SAML SSO Configuration</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Configure single sign-on via your identity provider</p>
                  </div>

                  <div className="p-4 space-y-4">
                    {ssoLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div key={i} className="h-10 rounded-lg bg-zinc-800/50 animate-pulse" />
                        ))}
                      </div>
                    ) : (
                      <>
                        {/* Enable/Disable toggle */}
                        {ssoConfig?.configured && (
                          <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-800/30">
                            <div>
                              <p className="text-sm font-medium text-zinc-200">SSO Enabled</p>
                              <p className="text-xs text-zinc-500">
                                {ssoConfig.enabled ? "Users can sign in via SSO" : "SSO is configured but disabled"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant={ssoConfig.enabled ? "destructive" : "default"}
                              onClick={handleToggleSso}
                              disabled={togglingSso}
                            >
                              {togglingSso ? "..." : ssoConfig.enabled ? "Disable" : "Enable"}
                            </Button>
                          </div>
                        )}

                        {/* App URL */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-400">Application URL</label>
                          <Input
                            value={ssoAppUrl}
                            onChange={(e) => setSsoAppUrl(e.target.value)}
                            placeholder="https://repan.company.com"
                            className="h-9 text-sm"
                          />
                          <p className="text-xs text-zinc-600">Public URL where this app is hosted</p>
                        </div>

                        {/* Config mode toggle */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-zinc-400">IdP Configuration Method</label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={ssoConfigMode === "metadata" ? "default" : "outline"}
                              onClick={() => setSsoConfigMode("metadata")}
                            >
                              Metadata URL
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={ssoConfigMode === "manual" ? "default" : "outline"}
                              onClick={() => setSsoConfigMode("manual")}
                            >
                              Manual
                            </Button>
                          </div>
                        </div>

                        {ssoConfigMode === "metadata" ? (
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-400">IdP Metadata URL</label>
                            <Input
                              value={ssoMetadataUrl}
                              onChange={(e) => setSsoMetadataUrl(e.target.value)}
                              placeholder="https://idp.company.com/nidp/saml2/metadata"
                              className="h-9 text-sm"
                            />
                            <p className="text-xs text-zinc-600">Your identity provider&apos;s SAML metadata endpoint</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-zinc-400">IdP Entity ID</label>
                              <Input
                                value={ssoIdpEntityId}
                                onChange={(e) => setSsoIdpEntityId(e.target.value)}
                                placeholder="https://idp.company.com/nidp/saml2"
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-zinc-400">IdP SSO URL</label>
                              <Input
                                value={ssoIdpSsoUrl}
                                onChange={(e) => setSsoIdpSsoUrl(e.target.value)}
                                placeholder="https://idp.company.com/nidp/saml2/sso"
                                className="h-9 text-sm"
                              />
                              <p className="text-xs text-zinc-600">URL to redirect users for authentication</p>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-medium text-zinc-400">IdP Signing Certificate</label>
                              <textarea
                                value={ssoIdpCertificate}
                                onChange={(e) => setSsoIdpCertificate(e.target.value)}
                                placeholder={"-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----"}
                                rows={4}
                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                              />
                              <p className="text-xs text-zinc-600">PEM-encoded X.509 certificate from your IdP (for verifying SAML assertions)</p>
                            </div>
                          </div>
                        )}

                        {/* Attribute mapping */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-400">UID Attribute</label>
                            <Input
                              value={ssoAttrUid}
                              onChange={(e) => setSsoAttrUid(e.target.value)}
                              placeholder="uid"
                              className="h-9 text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-medium text-zinc-400">Display Name Attribute</label>
                            <Input
                              value={ssoAttrDisplayName}
                              onChange={(e) => setSsoAttrDisplayName(e.target.value)}
                              placeholder="displayName"
                              className="h-9 text-sm"
                            />
                          </div>
                        </div>

                        {/* Error/Success messages */}
                        {ssoError && <p className="text-sm text-red-400">{ssoError}</p>}
                        {ssoSuccess && <p className="text-sm text-green-400">{ssoSuccess}</p>}

                        {/* Save button */}
                        <Button
                          onClick={handleSaveSso}
                          disabled={savingSso || !ssoAppUrl.trim() || (ssoConfigMode === "metadata" ? !ssoMetadataUrl.trim() : (!ssoIdpEntityId.trim() || !ssoIdpSsoUrl.trim() || !ssoIdpCertificate.trim()))}
                          className="w-full"
                        >
                          {savingSso ? "Saving..." : ssoConfigMode === "metadata" ? "Fetch Metadata & Save" : "Save Configuration"}
                        </Button>

                        {/* SP info for IdP registration */}
                        {ssoConfig?.configured && (
                          <div className="mt-4 p-3 rounded-lg border border-zinc-800 bg-zinc-800/30 space-y-2">
                            <p className="text-xs font-medium text-zinc-400">
                              Register these values with your Identity Provider:
                            </p>
                            <div className="space-y-1.5">
                              <div>
                                <p className="text-xs text-zinc-500">SP Entity ID</p>
                                <p className="text-sm text-zinc-200 font-mono break-all">{ssoConfig.spEntityId}</p>
                              </div>
                              <div>
                                <p className="text-xs text-zinc-500">ACS URL (Assertion Consumer Service)</p>
                                <p className="text-sm text-zinc-200 font-mono break-all">{ssoConfig.acsUrl}</p>
                              </div>
                            </div>
                            {ssoConfig.idpEntityId && (
                              <div className="pt-2 border-t border-zinc-700 space-y-1.5">
                                <p className="text-xs text-zinc-500">IdP Entity ID</p>
                                <p className="text-sm text-zinc-300 font-mono break-all">{ssoConfig.idpEntityId}</p>
                                <p className="text-xs text-zinc-500">IdP SSO URL</p>
                                <p className="text-sm text-zinc-300 font-mono break-all">{ssoConfig.idpSsoUrl}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Session Secret Security */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <h2 className="text-sm font-semibold text-zinc-200">Session Security</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Manage cryptographic keys for session tokens</p>
                  </div>

                  <div className="p-4 space-y-4">
                    {sessionSecretLoading ? (
                      <div className="h-10 rounded-lg bg-zinc-800/50 animate-pulse" />
                    ) : (
                      <>
                        <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-800/30">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-zinc-200 mb-1">Session Secret</p>
                              <p className="text-xs text-zinc-500 leading-relaxed">
                                Sessions are signed with HMAC-SHA256 using a secret key stored in the database.
                                {sessionSecretData?.configured
                                  ? " A secret is currently configured."
                                  : " No secret configured - using fallback (less secure)."}
                              </p>
                              {sessionSecretData?.lastUpdated && (
                                <p className="text-xs text-zinc-600 mt-1.5">
                                  Last generated: {formatDate(sessionSecretData.lastUpdated)}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={sessionSecretData?.configured ? "outline" : "default"}
                              onClick={handleGenerateSessionSecret}
                              disabled={generatingSecret}
                              className="shrink-0"
                            >
                              {generatingSecret ? "Generating..." : sessionSecretData?.configured ? "Regenerate" : "Generate"}
                            </Button>
                          </div>
                        </div>

                        {secretError && (
                          <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/50">
                            <p className="text-sm text-red-400">{secretError}</p>
                          </div>
                        )}

                        {secretSuccess && (
                          <div className="p-3 rounded-lg bg-green-950/30 border border-green-900/50">
                            <p className="text-sm text-green-400">{secretSuccess}</p>
                          </div>
                        )}

                        <div className="p-3 rounded-lg border border-amber-900/50 bg-amber-950/20">
                          <p className="text-xs text-amber-400 leading-relaxed">
                            <strong>Warning:</strong> Generating a new secret will invalidate all active user sessions.
                            All users will be required to log in again.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* User form dialog */}
      <UserForm
        open={userFormOpen}
        onClose={() => setUserFormOpen(false)}
        onSave={() => { mutateUsers(); mutateTeams(); }}
        initialData={editingUser}
        currentUserIsSuperAdmin={isSuperAdmin}
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

      {/* Delete team confirmation dialog */}
      <Dialog open={!!deleteTeamId} onOpenChange={(open) => { if (!open) setDeleteTeamId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Team</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete this team? This will remove all memberships. Tasks assigned to this team may become inaccessible.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteTeamId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTeam} disabled={deletingTeam}>
              {deletingTeam ? "Deleting..." : "Delete"}
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
      const res = await csrfFetch(`/api/teams/${teamId}`, {
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
