"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TeamIcon } from "@/lib/team-icons";

type Team = {
  id: string;
  name: string;
  role: string;
  memberCount?: number;
};

export default function TeamSelectPage() {
  const router = useRouter();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/teams", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setTeams(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to fetch teams:", err);
        setTeams([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectTeam = async (teamId: string) => {
    setSelecting(teamId);
    try {
      const res = await fetch("/api/teams/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ teamId }),
      });
      if (res.ok) {
        window.location.href = "/tasks";
      } else {
        setSelecting(null);
      }
    } catch {
      setSelecting(null);
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
          <p className="text-muted-foreground text-sm mt-3">Select your team</p>
        </div>

        {/* Team grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
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
        ) : teams.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>No teams found. Please contact your administrator.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {teams.map((team) => {
              const isLoading = selecting === team.id;
              const isDisabled = selecting !== null && !isLoading;
              return (
                <button
                  key={team.id}
                  onClick={() => handleSelectTeam(team.id)}
                  disabled={isDisabled || isLoading}
                  className={`flex flex-col items-center gap-3 p-8 rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-200
                    ${isLoading ? "opacity-80 scale-95" : ""}
                    ${isDisabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer active:scale-95"}
                  `}
                  onMouseEnter={(e) => {
                    if (!isDisabled && !isLoading) {
                      const el = e.currentTarget;
                      el.style.borderColor = "#8B5CF680";
                      el.style.boxShadow = `0 0 0 1px #8B5CF640, 0 4px 20px #8B5CF630`;
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
                  {/* Team icon */}
                  <div
                    className="h-20 w-20 rounded-full flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: "#8B5CF6" }}
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
                      <TeamIcon teamName={team.name} className="h-8 w-8" />
                    )}
                  </div>

                  {/* Team name */}
                  <span className="font-semibold text-sm text-center leading-tight">
                    {team.name}
                  </span>

                  {/* Member count */}
                  {team.memberCount !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
