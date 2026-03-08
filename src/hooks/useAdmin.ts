import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useIsAdmin = () => {
  const { user } = useAuth();

  const { data: isAdmin = false, isLoading, error } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      if (error) {
        console.error("Admin check error:", error);
        return false;
      }
      
      console.log("Admin check result:", { userId: user.id, data, isAdmin: !!data });
      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  return { isAdmin, isLoading };
};
