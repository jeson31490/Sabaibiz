"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getAvatarUrl } from "../../lib/avatar";
import { supabase } from "../../lib/supabase";
import { fetchMyMembership } from "../../lib/team";

/** Owner of the business, or a team member who joined it. */
export type UserRole = "owner" | "manager" | "employee";

export type UserProfile = {
  name: string;
  email: string;
  avatarUrl: string | null;
  /** From `business_name` in the Supabase user metadata, saved at signup. */
  businessName: string;
};

export const DEFAULT_BUSINESS_NAME = "My Business";

type UserContextValue = {
  user: UserProfile;
  updateUser: (changes: Partial<UserProfile>) => void;
  /** Null while it is being looked up, and when signed out. */
  role: UserRole | null;
  /** Looks the role up again, e.g. right after accepting a team invitation. */
  refreshRole: () => void;
};

// Placeholder until the profile is loaded from Supabase.
const DEFAULT_USER: UserProfile = {
  name: "Moustache Owner",
  email: "",
  avatarUrl: null,
  businessName: DEFAULT_BUSINESS_NAME,
};

// Name, email, photo and business name of a signed-in Supabase user.
function profileFromAuthUser(u: User): UserProfile {
  const meta = (u.user_metadata ?? {}) as Record<string, string | undefined>;
  return {
    name: meta.full_name || u.email || "",
    email: u.email ?? "",
    avatarUrl: getAvatarUrl(u),
    businessName: meta.business_name?.trim() || DEFAULT_BUSINESS_NAME,
  };
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<{ userId: string; role: UserRole } | null>(null);
  const [roleVersion, setRoleVersion] = useState(0);

  // Keep the profile (including the photo) in sync with the Supabase session on every page.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? profileFromAuthUser(session.user) : DEFAULT_USER);
      setUserId(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Role from team_members: an active membership of someone else's business makes this user a
  // manager or employee there; no membership means they own their own business.
  // Looked up here rather than in onAuthStateChange, where calling Supabase again can deadlock.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetchMyMembership(userId)
      .then((m) => (m?.status === "active" ? m.role : "owner"))
      // No team_members table yet (migration not run) means there are no teams: everyone is an owner.
      .catch(() => "owner" as const)
      .then((r) => {
        if (!cancelled) setRole({ userId, role: r });
      });
    return () => {
      cancelled = true;
    };
  }, [userId, roleVersion]);

  const value = useMemo<UserContextValue>(
    () => ({
      user,
      updateUser: (changes) => setUser((prev) => ({ ...prev, ...changes })),
      // Only trust a role looked up for the user who is signed in now.
      role: role && role.userId === userId ? role.role : null,
      refreshRole: () => {
        setRole(null); // don't keep showing the old role meanwhile
        setRoleVersion((v) => v + 1);
      },
    }),
    [user, role, userId],
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
