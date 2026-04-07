"use client";
import { SWRConfig } from "swr";
import { ReactNode, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { SessionTimeoutMonitor } from "./session-timeout-monitor";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 401 && typeof window !== "undefined") {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

// Render Toaster only after mount to avoid hydration mismatch in Safari
function ClientToaster() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <Toaster />;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: true }}>
      {children}
      <ClientToaster />
      <SessionTimeoutMonitor />
    </SWRConfig>
  );
}
