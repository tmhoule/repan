"use client";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { TeamIcon } from "@/lib/team-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type User = { id: string; name: string; avatarColor: string };
type Team = { id: string; name: string; members: User[] };

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function LoginPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [settingUp, setSettingUp] = useState(false);
  const [setupError, setSetupError] = useState("");

  // Team-first flow state
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bootstrap", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.needsSetup) {
          setNeedsSetup(true);
        } else {
          setTeams(data.teams ?? []);
          // If only one team, auto-select it
          if (data.teams?.length === 1) {
            setSelectedTeam(data.teams[0]);
          }
        }
      })
      .catch((err) => console.error("Failed to load:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName.trim()) return;
    setSettingUp(true);
    setSetupError("");
    try {
      const res = await fetch("/api/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: setupName.trim() }),
      });
      if (!res.ok && res.status !== 409) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Setup failed");
      }
      window.location.reload();
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSettingUp(false);
    }
  };

  const handleLogin = async (userId: string, teamId: string) => {
    setLoggingIn(userId);
    try {
      // Login
      const loginRes = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ userId }),
      });
      if (!loginRes.ok) { setLoggingIn(null); return; }

      // Set team
      const teamRes = await fetch("/api/teams/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ teamId }),
      });
      if (!teamRes.ok) { setLoggingIn(null); return; }

      window.location.href = "/tasks";
    } catch {
      setLoggingIn(null);
    }
  };

  const subtitle = needsSetup
    ? "Welcome! Let's set up your admin account."
    : selectedTeam
    ? "Choose your name"
    : "Select your team";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12"
      style={{
        background: "radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.06) 0%, transparent 70%)",
      }}
    >
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="text-5xl font-extrabold tracking-tight mb-2"
            style={{
              background: "linear-gradient(135deg, #8B5CF6, #06B6D4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Repan
          </h1>
          <p className="text-muted-foreground text-lg">Resource Planning</p>
          <p className="text-muted-foreground text-sm mt-1">Team Task Tracker</p>
          <p className="text-muted-foreground text-sm mt-3">{subtitle}</p>
        </div>

        {/* First-time setup */}
        {needsSetup && !loading ? (
          <div className="max-w-sm mx-auto">
            <form onSubmit={handleSetup} className="space-y-4 p-6 rounded-xl border bg-card">
              <div className="space-y-1.5">
                <Label htmlFor="admin-name">Your Name</Label>
                <Input
                  id="admin-name"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="Enter your name"
                  autoFocus
                />
              </div>
              {setupError && <p className="text-sm text-destructive">{setupError}</p>}
              <p className="text-xs text-muted-foreground">
                This creates your super admin account and a default team.
              </p>
              <Button type="submit" className="w-full" disabled={settingUp || !setupName.trim()}>
                {settingUp ? "Setting up..." : "Create Admin Account"}
              </Button>
            </form>
          </div>

        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3 p-8 rounded-xl border bg-card animate-pulse">
                <div className="h-16 w-16 rounded-2xl bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
              </div>
            ))}
          </div>

        ) : selectedTeam ? (
          /* ── Step 2: Pick your user ── */
          <div className="space-y-4">
            {/* Back to teams (only if multiple teams) */}
            {teams.length > 1 && (
              <button
                onClick={() => setSelectedTeam(null)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-4" />
                Back to teams
              </button>
            )}

            {/* Team header */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <TeamIcon teamName={selectedTeam.name} className="size-4" />
              <span className="text-sm font-medium">{selectedTeam.name}</span>
            </div>

            {selectedTeam.members.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No members on this team yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {selectedTeam.members.map((user) => {
                  const isLoading = loggingIn === user.id;
                  const isDisabled = loggingIn !== null && !isLoading;
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleLogin(user.id, selectedTeam.id)}
                      disabled={isDisabled || isLoading}
                      className={`flex flex-col items-center gap-3 p-8 rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200
                        ${isLoading ? "opacity-80 scale-95" : ""}
                        ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-95"}
                      `}
                      onMouseEnter={(e) => {
                        if (!isDisabled && !isLoading) {
                          const el = e.currentTarget;
                          const color = user.avatarColor ?? "#8B5CF6";
                          el.style.borderColor = color + "80";
                          el.style.boxShadow = `0 0 0 1px ${color}40, 0 4px 20px ${color}30`;
                          el.style.transform = "translateY(-1px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isDisabled && !isLoading) {
                          const el = e.currentTarget;
                          el.style.borderColor = "";
                          el.style.boxShadow = "";
                          el.style.transform = "";
                        }
                      }}
                    >
                      <div
                        className="h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-sm"
                        style={{ backgroundColor: user.avatarColor ?? "#6b7280" }}
                      >
                        {isLoading ? (
                          <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          getInitials(user.name)
                        )}
                      </div>
                      <span className="font-semibold text-sm text-center leading-tight">{user.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

        ) : teams.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>No teams found. Check your database connection.</p>
          </div>

        ) : (
          /* ── Step 1: Pick your team ── */
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {teams.map((team) => (
              <button
                key={team.id}
                onClick={() => setSelectedTeam(team)}
                className="flex flex-col items-center gap-3 p-8 rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200 cursor-pointer active:scale-95"
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = "rgba(139,92,246,0.5)";
                  el.style.boxShadow = "0 0 0 1px rgba(139,92,246,0.3), 0 4px 20px rgba(139,92,246,0.2)";
                  el.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.borderColor = "";
                  el.style.boxShadow = "";
                  el.style.transform = "";
                }}
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <TeamIcon teamName={team.name} className="size-8 text-primary" />
                </div>
                <span className="font-semibold text-sm text-center leading-tight">{team.name}</span>
                <span className="text-xs text-muted-foreground">
                  {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
