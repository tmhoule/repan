"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

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
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to fetch users:", err);
        setUsers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = async (userId: string) => {
    console.log("handleLogin called for:", userId);
    setLoggingIn(userId);
    try {
      console.log("Sending fetch to /api/auth/login...");
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ userId }),
      });
      console.log("Fetch response:", res.status, res.ok);
      if (res.ok) {
        console.log("Login success, redirecting...");
        window.location.href = "/tasks";
      } else {
        console.error("Login failed:", res.status);
        setLoggingIn(null);
      }
    } catch {
      setLoggingIn(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
            Repan
          </h1>
          <p className="text-muted-foreground text-lg">
            Gamified team task tracker
          </p>
          <p className="text-muted-foreground text-sm mt-3">
            Select your profile to continue
          </p>
        </div>

        {/* User grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border bg-card animate-pulse"
              >
                <div className="h-16 w-16 rounded-full bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-5 w-16 rounded-full bg-muted" />
              </div>
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>No users found. Please seed the database.</p>
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
                  className={`flex flex-col items-center gap-3 p-6 rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-150
                    ${isLoading ? "opacity-80 scale-95" : ""}
                    ${isDisabled ? "opacity-40 cursor-not-allowed" : "hover:border-primary hover:shadow-md hover:-translate-y-0.5 cursor-pointer active:scale-95"}
                  `}
                >
                  {/* Avatar */}
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-sm"
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
