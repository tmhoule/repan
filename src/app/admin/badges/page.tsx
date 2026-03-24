"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Badges management is integrated into the main admin page as a tab.
// This page redirects there for convenience.
export default function AdminBadgesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);
  return null;
}
