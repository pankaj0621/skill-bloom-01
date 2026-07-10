import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FullscreenLoader from "@/components/FullscreenLoader";

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
    return <FullscreenLoader />;
  }

  if (!user) {
    const from = location.pathname + location.search;
    return <Navigate to="/auth" replace state={{ from }} />;
  }

  // If user hasn't completed onboarding, redirect to onboarding
  // Check username OR (role + stream) for backward compatibility with older users
  if (!hasCompletedOnboarding && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
