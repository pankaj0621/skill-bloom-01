import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playMessageSound, playFriendRequestSound } from "@/lib/sounds";

export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("global-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "peer_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.to_user_id === userId) {
            playMessageSound();
            toast("New message", {
              description: msg.body?.slice(0, 60) || "You have a new message",
              action: {
                label: "View",
                onClick: () => { window.location.href = "/peers"; },
              },
            });
            queryClient.invalidateQueries({ queryKey: ["unread_peer_messages"] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "friendships" },
        (payload) => {
          const row = payload.new as any;
          if (row.addressee_id === userId && row.status === "pending") {
            playFriendRequestSound();
            toast("New friend request", {
              description: "Someone wants to connect with you!",
              action: {
                label: "View",
                onClick: () => { window.location.href = "/community"; },
              },
            });
          }
          queryClient.invalidateQueries({ queryKey: ["pending_friend_requests_count"] });
          queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
          queryClient.invalidateQueries({ queryKey: ["friends_list"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "friendships" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pending_friend_requests_count"] });
          queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
          queryClient.invalidateQueries({ queryKey: ["friends_list"] });
          queryClient.invalidateQueries({ queryKey: ["friendship"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "friendships" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["pending_friend_requests_count"] });
          queryClient.invalidateQueries({ queryKey: ["friend_requests"] });
          queryClient.invalidateQueries({ queryKey: ["friends_list"] });
          queryClient.invalidateQueries({ queryKey: ["friendship"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);
}
