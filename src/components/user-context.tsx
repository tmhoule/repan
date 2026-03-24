"use client";
import { createContext, useContext, ReactNode, useState } from "react";

type User = { id: string; name: string; role: string; avatarColor: string } | null;

const UserContext = createContext<{
  user: User;
  setUser: (u: User) => void;
  logout: () => void;
}>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export function UserProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: User;
}) {
  const [user, setUser] = useState<User>(initialUser);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <UserContext.Provider value={{ user, setUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
