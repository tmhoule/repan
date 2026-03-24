"use client";
import { createContext, useContext, ReactNode, useState } from "react";

type User = { id: string; name: string; role: string; avatarColor: string; isSuperAdmin?: boolean } | null;
type ActiveTeam = { id: string; name: string } | null;

const UserContext = createContext<{
  user: User;
  setUser: (u: User) => void;
  activeTeam: ActiveTeam;
  setActiveTeam: (t: ActiveTeam) => void;
  logout: () => void;
}>({
  user: null,
  setUser: () => {},
  activeTeam: null,
  setActiveTeam: () => {},
  logout: () => {},
});

export function UserProvider({
  children,
  initialUser,
  initialTeam,
}: {
  children: ReactNode;
  initialUser: User;
  initialTeam: ActiveTeam;
}) {
  const [user, setUser] = useState<User>(initialUser);
  const [activeTeam, setActiveTeam] = useState<ActiveTeam>(initialTeam);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <UserContext.Provider value={{ user, setUser, activeTeam, setActiveTeam, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
