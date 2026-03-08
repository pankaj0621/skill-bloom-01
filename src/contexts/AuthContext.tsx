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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        // Defer to avoid Supabase deadlock
        setTimeout(() => checkSuspension(session.user.id), 0);
      } else {
        setIsSuspended(false);
        setSuspendReason(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        checkSuspension(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
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
