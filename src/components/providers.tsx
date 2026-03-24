"use client";
import { SWRConfig } from "swr";
import { ReactNode } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: true }}>
      {children}
    </SWRConfig>
  );
}
