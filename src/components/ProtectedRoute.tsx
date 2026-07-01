import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  const { data: profile, isLoading: profileLoading, isFetching: profileFetching } = useQuery({
    queryKey: ["profile-onboarding-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, role, stream")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 0,
  });

  const hasCompletedOnboarding = profile?.username || (profile?.role && profile?.stream);

  // If we have a user but the cached profile looks incomplete AND we're still
  // revalidating from the server, wait — otherwise a stale persisted `null`
  // will bounce a fully onboarded user back to /onboarding on refresh.
  const waitingForFreshProfile =
    !!user && !hasCompletedOnboarding && profileFetching;

  if (loading || (user && profileLoading) || waitingForFreshProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user hasn't completed onboarding, redirect to onboarding
  // Check username OR (role + stream) for backward compatibility with older users
  if (!hasCompletedOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
