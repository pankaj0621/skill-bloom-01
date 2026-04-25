import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useBlockUser(userId: string | undefined, targetId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: isBlocked, isLoading } = useQuery({
    queryKey: ["blocked_user", userId, targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_users")
        .select("id")
        .eq("blocker_id", userId!)
        .eq("blocked_id", targetId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!userId && !!targetId && userId !== targetId,
  });

  const blockUser = useMutation({
    mutationFn: async () => {
      // Block + remove friendship if exists
      const { error } = await supabase
        .from("blocked_users")
        .insert({ blocker_id: userId!, blocked_id: targetId! });
      if (error) throw error;

      // Also delete friendship if any
      await supabase
        .from("friendships")
        .delete()
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${userId})`
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked_user"] });
      queryClient.invalidateQueries({ queryKey: ["friendship"] });
      queryClient.invalidateQueries({ queryKey: ["friends_list"] });
      queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
      toast.success("User blocked");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to block user"),
  });

  const unblockUser = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("blocked_users")
        .delete()
        .eq("blocker_id", userId!)
        .eq("blocked_id", targetId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked_user"] });
      toast.success("User unblocked");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to unblock user"),
  });

  return {
    isBlocked: isBlocked ?? false,
    isLoading,
    blockUser,
    unblockUser,
  };
}
