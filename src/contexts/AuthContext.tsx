import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isSuspended: boolean;
  suspendReason: string | null;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
  isSuspended: false,
  suspendReason: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendReason, setSuspendReason] = useState<string | null>(null);

  const checkSuspension = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("is_suspended, suspend_reason, suspended_until")
      .eq("id", userId)
      .maybeSingle();

    if (data?.is_suspended) {
      // Check if suspension has expired
      if (data.suspended_until && new Date(data.suspended_until) < new Date()) {
        // Auto-unsuspend
        await supabase.from("profiles").update({
          is_suspended: false,
          suspend_reason: null,
          suspended_at: null,
          suspended_until: null,
          suspended_by: null,
        }).eq("id", userId);
        setIsSuspended(false);
        setSuspendReason(null);
        return;
      }
      setIsSuspended(true);
      setSuspendReason(data.suspend_reason);
    } else {
      setIsSuspended(false);
      setSuspendReason(null);
    }
  };

  useEffect(() => {
    let active = true;

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        // Defer to avoid auth-client deadlocks inside auth callbacks.
        setTimeout(() => checkSuspension(nextSession.user.id), 0);
      } else {
        setIsSuspended(false);
        setSuspendReason(null);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // INITIAL_SESSION can arrive before storage restore has fully settled in
      // some browsers. The explicit bootstrap below is the single source for
      // initial readiness, preventing auth → login → auth loops on refresh.
      if (event === "INITIAL_SESSION") return;
      applySession(nextSession);
      setLoading(false);
    });

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        applySession(data.session);
      } catch (err) {
        const code = (err as { code?: string })?.code;
        if (code === "refresh_token_not_found" || code === "refresh_token_already_used") {
          await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        }
        applySession(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setIsSuspended(false);
    setSuspendReason(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, isSuspended, suspendReason }}>
      {children}
    </AuthContext.Provider>
  );
};
