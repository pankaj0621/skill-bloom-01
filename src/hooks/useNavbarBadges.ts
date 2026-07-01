import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useNavbarBadges(userId: string | undefined) {
  const { data: pendingRequestCount } = useQuery({
    queryKey: ["pending_friend_requests_count", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("id")
        .eq("addressee_id", userId!)
        .eq("status", "pending");
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!userId,
  });

  // Distinct query key so this narrow SELECT doesn't clobber Dashboard's
  // full profile fetch cached under ["profile", userId].
  const { data: navProfile } = useQuery({
    queryKey: ["navbar_profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  return { pendingRequestCount: pendingRequestCount || 0, navProfile };
}
