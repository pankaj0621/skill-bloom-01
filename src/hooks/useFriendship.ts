import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type FriendshipStatus = "pending" | "accepted" | "rejected" | "none";

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useFriendship(userId: string | undefined, targetId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: friendship, isLoading } = useQuery({
    queryKey: ["friendship", userId, targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${userId})`
        )
        .maybeSingle();
      if (error) throw error;
      return data as Friendship | null;
    },
    enabled: !!userId && !!targetId && userId !== targetId,
  });

  const getStatus = (): { status: FriendshipStatus; isSender: boolean } => {
    if (!friendship) return { status: "none", isSender: false };
    return {
      status: friendship.status as FriendshipStatus,
      isSender: friendship.requester_id === userId,
    };
  };

  const sendRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("friendships").insert({
        requester_id: userId!,
        addressee_id: targetId!,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendship", userId, targetId] });
      queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
      toast.success("Friend request sent!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to send request"),
  });

  const acceptRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendship!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendship"] });
      queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends_list"] });
      toast.success("Friend request accepted!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "rejected" })
        .eq("id", friendship!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendship"] });
      queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
    },
  });

  const removeFriend = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("friendships")
        .delete()
        .eq("id", friendship!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendship"] });
      queryClient.invalidateQueries({ queryKey: ["friends_list"] });
      queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
      toast.success("Friend removed.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    friendship,
    isLoading,
    ...getStatus(),
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
  };
}

export function useFriendRequests(userId: string | undefined) {
  return useQuery({
    queryKey: ["friend_requests", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("*, profiles!friendships_requester_id_fkey(id, display_name, avatar_url, computed_level, stream, college)")
        .eq("addressee_id", userId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) {
        // Fallback: fetch without join if FK doesn't exist
        const { data: raw, error: rawErr } = await supabase
          .from("friendships")
          .select("*")
          .eq("addressee_id", userId!)
          .eq("status", "pending")
          .order("created_at", { ascending: false });
        if (rawErr) throw rawErr;
        return raw || [];
      }
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useFriendsList(userId: string | undefined) {
  return useQuery({
    queryKey: ["friends_list", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
      if (error) throw error;
      
      const friendIds = (data || []).map((f) =>
        f.requester_id === userId ? f.addressee_id : f.requester_id
      );
      
      if (friendIds.length === 0) return [];
      
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, computed_level, stream, college, primary_goal")
        .in("id", friendIds);
      if (pErr) throw pErr;
      return profiles || [];
    },
    enabled: !!userId,
  });
}

export function useIsFriend(userId: string | undefined, targetId: string | undefined) {
  const { data } = useQuery({
    queryKey: ["is_friend", userId, targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("id")
        .eq("status", "accepted")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${userId})`
        )
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!userId && !!targetId && userId !== targetId,
  });
  return data ?? false;
}
