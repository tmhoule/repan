"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, LogOut, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { GlobalSearch } from "@/components/layout/search";
import { useUser } from "@/components/user-context";

const staffNavLinks = [
  { href: "/tasks", label: "My Tasks" },
  { href: "/team", label: "Team" },
];

const managerNavLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/reports", label: "Reports" },
  { href: "/history", label: "History" },
  { href: "/admin", label: "Admin" },
];

export function Header() {
  const { user, activeTeam, logout } = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isManager = user?.role === "manager";
  const allLinks = isManager
    ? [...staffNavLinks, ...managerNavLinks]
    : staffNavLinks;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 gap-4">
        {/* Logo */}
        <Link
          href="/tasks"
          className="flex items-center gap-2 font-bold text-lg shrink-0"
        >
          <span className="text-primary">Repan</span>
        </Link>

        {/* Active team indicator */}
        {activeTeam && (
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted rounded-md px-2 py-1 shrink-0">
            <Users className="h-3 w-3" />
            {activeTeam.name}
          </span>
        )}

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {staffNavLinks.map((link) => {
            const isActive =
              pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                  isActive
                    ? "bg-accent text-accent-foreground shadow-[inset_0_-2px_0_#8B5CF6]"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          {isManager && (
            <>
              <div className="mx-2 h-4 w-px bg-border" />
              {managerNavLinks.map((link) => {
                const isActive =
                  pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                      isActive
                        ? "bg-accent text-accent-foreground shadow-[inset_0_-2px_0_#8B5CF6]"
                        : "text-muted-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {user && <GlobalSearch />}
          {user && <NotificationBell />}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger
                className="flex items-center gap-2 h-9 px-2 rounded-lg hover:bg-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="User menu"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback
                    className="text-xs font-semibold text-white"
                    style={{
                      backgroundColor: user.avatarColor ?? "#6b7280",
                    }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                  {user.name}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-1">
                    <span>{user.name}</span>
                    <Badge
                      variant={isManager ? "default" : "secondary"}
                      className="w-fit text-xs"
                    >
                      {user.role}
                    </Badge>
                    {activeTeam && (
                      <span className="text-xs text-muted-foreground font-normal">
                        {activeTeam.name}
                      </span>
                    )}
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/team-select")}>
                  <Users className="mr-2 h-4 w-4" />
                  Switch Team
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={logout}
                  variant="destructive"
                  className="cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t px-4 py-3 flex flex-col gap-1">
          {allLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                pathname === link.href ||
                pathname.startsWith(link.href + "/")
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
