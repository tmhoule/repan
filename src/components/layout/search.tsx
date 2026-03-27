"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { StatusBadge } from "@/components/tasks/status-badge";

interface SearchTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedTo?: { name: string } | null;
  matchedComment?: string | null;
}

interface SearchUser {
  id: string;
  name: string;
  avatarColor: string;
  role: string;
}

interface SearchResults {
  tasks: SearchTask[];
  users: SearchUser[];
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults(null);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, close]);

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape" && open) {
        close();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, close]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) setResults(await res.json());
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const hasResults = results && (results.tasks.length > 0 || results.users.length > 0);
  const noResults = results && results.tasks.length === 0 && results.users.length === 0 && query.length >= 2;

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); }}
        className="hidden md:inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-input bg-transparent text-xs text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="size-3.5" />
        <span>Search...</span>
        <kbd className="ml-2 pointer-events-none hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="flex items-center gap-2 h-8 px-3 rounded-lg border border-primary/50 bg-background w-72">
        <Search className="size-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks, users, comments..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {(hasResults || noResults || loading) && (
        <div className="absolute top-full mt-1 left-0 w-80 rounded-lg border border-border bg-card shadow-xl z-50 overflow-hidden">
          {loading && !results && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">Searching...</div>
          )}

          {noResults && (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">No results found</div>
          )}

          {results && results.users.length > 0 && (
            <div className="border-b border-border">
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">People</p>
              {results.users.map((u) => (
                <Link
                  key={u.id}
                  href={`/profile/${u.id}`}
                  onClick={close}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors"
                >
                  <span
                    className="inline-flex items-center justify-center size-5 rounded-full text-white text-[9px] font-bold shrink-0"
                    style={{ backgroundColor: u.avatarColor }}
                  >
                    {u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                  <span className="text-sm truncate">{u.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{u.role}</span>
                </Link>
              ))}
            </div>
          )}

          {results && results.tasks.length > 0 && (
            <div>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tasks</p>
              {results.tasks.map((t) => (
                <Link
                  key={t.id}
                  href={`/tasks/${t.id}`}
                  onClick={close}
                  className="flex items-start gap-2 px-3 py-2 hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{t.title}</span>
                    </div>
                    {t.matchedComment && (
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        Comment: &ldquo;{t.matchedComment}&rdquo;
                      </p>
                    )}
                    {t.assignedTo && (
                      <span className="text-[10px] text-muted-foreground">{t.assignedTo.name}</span>
                    )}
                  </div>
                  <StatusBadge status={t.status as any} className="shrink-0 text-[10px]" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
