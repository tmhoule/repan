"use client";
import { SWRConfig } from "swr";
import { ReactNode, useEffect, useState } from "react";
import { Toaster } from "sonner";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });

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
    </SWRConfig>
  );
}
