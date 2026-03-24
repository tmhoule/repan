"use client";
import { SWRConfig } from "swr";
import { ReactNode } from "react";
import { Toaster } from "sonner";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  });

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: true }}>
      {children}
      <Toaster />
    </SWRConfig>
  );
}
