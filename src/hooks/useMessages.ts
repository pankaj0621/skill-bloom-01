import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { playMessageSound } from "@/lib/sounds";

export interface ConversationPreview {
  peerId: string;
  peerName: string;
  peerLevel: string;
  peerAvatarUrl: string | null;
  peerUsername: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export function useConversations(userId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: allMessages } = useQuery({
    queryKey: ["all_peer_messages", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_messages")
        .select("*")
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const peerIds = useMemo(() => {
    if (!allMessages || !userId) return [];
    const ids = new Set<string>();
    allMessages.forEach((m) => {
      if (m.from_user_id !== userId) ids.add(m.from_user_id);
      if (m.to_user_id !== userId) ids.add(m.to_user_id);
    });
    return Array.from(ids);
  }, [allMessages, userId]);

  const { data: peerProfiles } = useQuery({
    queryKey: ["peer_profiles", peerIds],
    queryFn: async () => {
      if (peerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, computed_level, username")
        .in("id", peerIds);
      if (error) throw error;
      return data;
    },
    enabled: peerIds.length > 0,
  });

  const conversations: ConversationPreview[] = useMemo(() => {
    if (!allMessages || !userId || !peerProfiles) return [];
    const map = new Map<string, ConversationPreview>();

    for (const msg of allMessages) {
      const peerId = msg.from_user_id === userId ? msg.to_user_id : msg.from_user_id;
      if (!map.has(peerId)) {
        const profile = peerProfiles.find((p) => p.id === peerId);
        map.set(peerId, {
          peerId,
          peerName: profile?.display_name || "Student",
          peerLevel: profile?.computed_level || "Beginner",
          peerAvatarUrl: profile?.avatar_url || null,
          peerUsername: profile?.username || null,
          lastMessage: msg.body,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
        });
      }
      const conv = map.get(peerId)!;
      if (msg.to_user_id === userId && !msg.read) {
        conv.unreadCount++;
      }
    }

    return Array.from(map.values());
  }, [allMessages, userId, peerProfiles]);

  const totalUnread = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("chat-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "peer_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.from_user_id === userId || msg.to_user_id === userId) {
            if (msg.to_user_id === userId) {
              playMessageSound();
            }
            queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
            queryClient.invalidateQueries({ queryKey: ["peer_messages"] });
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "peer_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.from_user_id === userId || msg.to_user_id === userId) {
            queryClient.invalidateQueries({ queryKey: ["peer_messages"] });
            queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  return { conversations, peerProfiles, totalUnread };
}

export function useChatMessages(userId: string | undefined, peerId: string | null) {
  const queryClient = useQueryClient();

  const { data: messages } = useQuery({
    queryKey: ["peer_messages", userId, peerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_messages")
        .select("*")
        .or(
          `and(from_user_id.eq.${userId},to_user_id.eq.${peerId}),and(from_user_id.eq.${peerId},to_user_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && !!peerId,
  });

  // Mark as read
  useEffect(() => {
    if (!userId || !peerId) return;
    supabase
      .from("peer_messages")
      .update({ read: true })
      .eq("to_user_id", userId)
      .eq("from_user_id", peerId)
      .eq("read", false)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
        queryClient.invalidateQueries({ queryKey: ["unread_peer_messages"] });
      });
  }, [userId, peerId, messages, queryClient]);

  return { messages };
}

export function useSendMessage(userId: string | undefined, peerId: string | null) {
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");

  const sendMessage = useMutation({
    mutationFn: async () => {
      const trimmed = messageText.trim();
      if (!trimmed || !peerId) return;
      if (trimmed.length > 5000) throw new Error("Message must be 5000 characters or fewer");
      const { error } = await supabase.from("peer_messages").insert({
        from_user_id: userId!,
        to_user_id: peerId,
        body: trimmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["peer_messages"] });
      queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { messageText, setMessageText, sendMessage };
}

export function formatMessageTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
