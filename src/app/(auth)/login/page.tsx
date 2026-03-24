"use client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type User = {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function LoginPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [settingUp, setSettingUp] = useState(false);
  const [setupError, setSetupError] = useState("");

  useEffect(() => {
    // Check if setup is needed first
    fetch("/api/bootstrap", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.needsSetup) {
          setNeedsSetup(true);
          setLoading(false);
          return;
        }
        // Setup done, fetch users
        return fetch("/api/users", { cache: "no-store" })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then((data) => {
            setUsers(Array.isArray(data) ? data : []);
          });
      })
      .catch((err) => {
        console.error("Failed to load:", err);
        setUsers([]);
      })
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
      // Success or already exists — either way, reload to show users
      window.location.reload();
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSettingUp(false);
    }
  };

  const handleLogin = async (userId: string) => {
    setLoggingIn(userId);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        const teams: { id: string }[] = data.teams ?? [];
        if (teams.length > 1) {
          window.location.href = "/team-select";
        } else {
          window.location.href = "/tasks";
        }
      } else {
        setLoggingIn(null);
      }
    } catch {
      setLoggingIn(null);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12"
      style={{
        background:
          "radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.06) 0%, transparent 70%)",
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
          <p className="text-muted-foreground text-lg">Team Task Tracker</p>
          <p className="text-muted-foreground text-sm mt-3">
            {needsSetup ? "Welcome! Let's set up your admin account." : "Choose your player"}
          </p>
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
                This creates your super admin account and a default team. You can add more users and teams from the Admin panel.
              </p>
              <Button type="submit" className="w-full" disabled={settingUp || !setupName.trim()}>
                {settingUp ? "Setting up..." : "Create Admin Account"}
              </Button>
            </form>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-3 p-8 rounded-xl border bg-card animate-pulse"
              >
                <div className="h-20 w-20 rounded-full bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-5 w-16 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>No users found. Check your database connection.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {users.map((user) => {
              const isLoading = loggingIn === user.id;
              const isDisabled = loggingIn !== null && !isLoading;
              return (
                <button
                  key={user.id}
                  onClick={() => handleLogin(user.id)}
                  disabled={isDisabled || isLoading}
                  className={`flex flex-col items-center gap-3 p-8 rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200
                    ${isLoading ? "opacity-80 scale-95" : ""}
                    ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-95"}
                  `}
                  style={
                    !isDisabled && !isLoading
                      ? {
                          // hover handled via onMouseEnter/Leave below
                        }
                      : undefined
                  }
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
                  {/* Avatar */}
                  <div
                    className="h-20 w-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-sm"
                    style={{ backgroundColor: user.avatarColor ?? "#6b7280" }}
                  >
                    {isLoading ? (
                      <svg
                        className="animate-spin h-6 w-6 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                    ) : (
                      getInitials(user.name)
                    )}
                  </div>

                  {/* Name */}
                  <span className="font-semibold text-sm text-center leading-tight">
                    {user.name}
                  </span>

                  {/* Role badge */}
                  <Badge
                    variant={user.role === "manager" ? "default" : "secondary"}
                    className="text-xs capitalize"
                  >
                    {user.role}
                  </Badge>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
