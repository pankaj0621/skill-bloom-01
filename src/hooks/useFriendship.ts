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
    // Optimistic: flip button to "Request sent" instantly
    onMutate: async () => {
      const key = ["friendship", userId, targetId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, {
        id: `temp-${Date.now()}`,
        requester_id: userId,
        addressee_id: targetId,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous !== undefined) queryClient.setQueryData(["friendship", userId, targetId], ctx.previous);
      toast.error(e.message || "Failed to send request");
    },
    onSuccess: () => toast.success("Friend request sent!"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["friendship", userId, targetId] });
      queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
    },
  });

  const acceptRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendship!.id);
      if (error) throw error;
    },
    onMutate: async () => {
      const key = ["friendship", userId, targetId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Friendship>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, status: "accepted" });
      // Remove from pending list instantly
      queryClient.setQueryData(["friend_requests", userId], (old: Friendship[] | undefined) =>
        (old || []).filter((r) => r.id !== friendship?.id)
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous !== undefined) queryClient.setQueryData(["friendship", userId, targetId], ctx.previous);
      toast.error(e.message);
    },
    onSuccess: () => toast.success("Friend request accepted!"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["friendship"] });
      queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
      queryClient.invalidateQueries({ queryKey: ["friends_list"] });
      queryClient.invalidateQueries({ queryKey: ["pending_friend_requests_count"] });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("friendships")
        .update({ status: "rejected" })
        .eq("id", friendship!.id);
      if (error) throw error;
    },
    onMutate: async () => {
      queryClient.setQueryData(["friend_requests", userId], (old: Friendship[] | undefined) =>
        (old || []).filter((r) => r.id !== friendship?.id)
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["friendship"] });
      queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
      queryClient.invalidateQueries({ queryKey: ["pending_friend_requests_count"] });
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
    onMutate: async () => {
      const key = ["friendship", userId, targetId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      queryClient.setQueryData(key, null);
      queryClient.setQueryData(["friends_list", userId], (old: { id: string }[] | undefined) =>
        (old || []).filter((f) => f.id !== targetId)
      );
      return { previous };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.previous !== undefined) queryClient.setQueryData(["friendship", userId, targetId], ctx.previous);
      toast.error(e.message);
    },
    onSuccess: () => toast.success("Friend removed."),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["friendship"] });
      queryClient.invalidateQueries({ queryKey: ["friends_list"] });
      queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
    },
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
      // Two-step fetch — no FK relationship exists between friendships and profiles,
      // so PostgREST joins fail. Fetch requests first, then hydrate requester profiles.
      const { data: rows, error } = await supabase
        .from("friendships")
        .select("*")
        .eq("addressee_id", userId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      const requesterIds = Array.from(new Set(rows.map((r) => r.requester_id)));
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, computed_level, stream, college, username")
        .in("id", requesterIds);
      if (pErr) throw pErr;

      const map = new Map((profiles || []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, profiles: map.get(r.requester_id) || null }));
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
