import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playFriendRequestSound } from "@/lib/sounds";

export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("global-realtime")
      // Friendships
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
      // Notifications
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["unread_notifications_count"] });
        }
      )
      // Messages
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "peer_messages" },
        (payload) => {
          const row = payload.new as any;
          if (row.to_user_id === userId) {
            queryClient.invalidateQueries({ queryKey: ["conversations"] });
            queryClient.invalidateQueries({ queryKey: ["messages"] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "peer_messages" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversations"] });
          queryClient.invalidateQueries({ queryKey: ["messages"] });
        }
      )
      // Badges
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_badges", filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user_badges", userId] });
        }
      )
      // Skill Progress
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_skill_progress", filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user_progress", userId] });
          queryClient.invalidateQueries({ queryKey: ["user_progress_full", userId] });
        }
      )
      // Profile changes
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["profile", userId] });
          queryClient.invalidateQueries({ queryKey: ["settings_profile", userId] });
          queryClient.invalidateQueries({ queryKey: ["navbar_profile"] });
        }
      )
      // User settings
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_settings", filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user_settings", userId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);
}
