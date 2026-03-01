"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { AuthModal } from "@/components/AuthModal";

type User = {
  id: string;
  name: string | null;
  phone: string | null;
};

type AuthContextType = {
  user: User | null;
  setUser: (u: User | null) => void;
  logout: () => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const setUser = useCallback((u: User | null) => setUserState(u), []);
  const logout = useCallback(() => {
    setUserState(null);
    if (typeof window !== "undefined") localStorage.removeItem("travel_token");
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("travel_token") : null;
    if (!token) return;
    fetch("/api/user/context", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.user) setUserState(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, logout, authModalOpen, setAuthModalOpen }}>
      {children}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within Providers");
  return ctx;
}
