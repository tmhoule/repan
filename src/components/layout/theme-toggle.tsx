"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";

const modes = ["light", "dark", "system"] as const;
const icons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;
const labels = {
  light: "Switch to dark mode",
  dark: "Switch to system mode",
  system: "Switch to light mode",
} as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
        <Moon className="h-4 w-4" />
      </Button>
    );
  }

  const current = (theme ?? "dark") as (typeof modes)[number];
  const Icon = icons[current] ?? Moon;
  const nextIndex = (modes.indexOf(current) + 1) % modes.length;
  const next = modes[nextIndex];

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(next)}
      aria-label={labels[current]}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
