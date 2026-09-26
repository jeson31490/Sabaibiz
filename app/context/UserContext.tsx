"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getAvatarUrl } from "../../lib/avatar";
import { supabase } from "../../lib/supabase";

export type UserProfile = {
  name: string;
  email: string;
  avatarUrl: string | null;
};

type UserContextValue = {
  user: UserProfile;
  updateUser: (changes: Partial<UserProfile>) => void;
};

// Placeholder until the profile is loaded from Supabase.
const DEFAULT_USER: UserProfile = {
  name: "Moustache Owner",
  email: "",
  avatarUrl: null,
};

// Name, email and photo of a signed-in Supabase user.
function profileFromAuthUser(u: User): UserProfile {
  const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    name: meta.full_name || u.email || "",
    email: u.email ?? "",
    avatarUrl: getAvatarUrl(u),
  };
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);

  // Keep the profile (including the photo) in sync with the Supabase session on every page.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? profileFromAuthUser(session.user) : DEFAULT_USER);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      updateUser: (changes) => setUser((prev) => ({ ...prev, ...changes })),
    }),
    [user],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within a UserProvider");
  return ctx;
}

export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
