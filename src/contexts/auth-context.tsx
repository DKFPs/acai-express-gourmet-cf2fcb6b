import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { profileService } from "@/services/profile.service";
import type { AppRole, Profile } from "@/types";

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [nextProfile, nextRoles] = await Promise.all([
        profileService.getProfile(userId),
        profileService.getRoles(userId),
      ]);
      setProfile(nextProfile);
      setRoles(nextRoles);
    } catch (error) {
      console.error("Falha ao carregar dados do usuário", error);
    }
  }, []);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        // Evita deadlock: consultas fora do callback do listener.
        setTimeout(() => void loadUserData(nextSession.user.id), 0);
      } else {
        setProfile(null);
        setRoles([]);
      }
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session?.user) await loadUserData(data.session.user.id);
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, [loadUserData]);

  const value = useMemo<AuthContextValue>(() => {
    const hasRole = (role: AppRole) => roles.includes(role);
    return {
      session,
      user: session?.user ?? null,
      profile,
      roles,
      loading,
      isAuthenticated: Boolean(session?.user),
      hasRole,
      hasAnyRole: (list: AppRole[]) => list.some(hasRole),
      isAdmin: hasRole("administrador"),
      refreshProfile: async () => {
        if (session?.user) await loadUserData(session.user.id);
      },
    };
  }, [session, profile, roles, loading, loadUserData]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
