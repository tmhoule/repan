"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

export function SessionTimeoutMonitor() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Don't poll on login or team-select pages
    if (pathname === "/login" || pathname === "/team-select") {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session-check");
        if (res.status === 401) {
          window.location.href = "/login";
        }
      } catch {
        // Network error — don't redirect
      }
    };

    intervalRef.current = setInterval(checkSession, CHECK_INTERVAL);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pathname]);

  return null;
}
