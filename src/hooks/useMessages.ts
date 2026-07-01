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
    // Sort for a stable query key — prevents needless refetches when the
    // underlying Set order changes but the peer set is identical.
    return Array.from(ids).sort();
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

  return { conversations, peerProfiles, totalUnread };
}

/**
 * Standalone realtime subscription for peer messages. Mount ONCE globally
 * so incoming-message sound + cache invalidation keep working on routes
 * that hide the Navbar (AI Mentor, Onboarding, etc.).
 */
export function useConversationsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`chat-realtime-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "peer_messages" },
        (payload) => {
          const msg = payload.new as { from_user_id: string; to_user_id: string };
          if (msg.from_user_id === userId || msg.to_user_id === userId) {
            if (msg.to_user_id === userId) {
              playMessageSound();
              // Only reconcile from server for INCOMING messages. Outgoing
              // messages are already swapped in-place by useSendMessage
              // onSuccess — invalidating here would cause the just-sent
              // bubble to briefly disappear during refetch.
              queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
              queryClient.invalidateQueries({ queryKey: ["peer_messages"] });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "peer_messages" },
        (payload) => {
          const msg = payload.new as { from_user_id: string; to_user_id: string };
          if (msg.from_user_id === userId || msg.to_user_id === userId) {
            queryClient.invalidateQueries({ queryKey: ["peer_messages"] });
            queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);
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

  // Mark as read — only fire when there's actually unread inbound mail,
  // otherwise every optimistic message spams an UPDATE round-trip.
  useEffect(() => {
    if (!userId || !peerId || !messages) return;
    const hasUnread = messages.some(
      (m) => m.to_user_id === userId && m.from_user_id === peerId && !m.read
    );
    if (!hasUnread) return;
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
      if (!trimmed || !peerId) return null;
      if (trimmed.length > 5000) throw new Error("Message must be 5000 characters or fewer");
      const { data, error } = await supabase
        .from("peer_messages")
        .insert({ from_user_id: userId!, to_user_id: peerId, body: trimmed })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    // ── Optimistic update — Instagram-style instant reflection.
    // Bubble appears immediately, input clears, no spinner. Realtime/refetch
    // later replaces the temp row with the canonical server row.
    onMutate: async () => {
      const trimmed = messageText.trim();
      if (!trimmed || !peerId || !userId) return;
      setMessageText("");

      const key = ["peer_messages", userId, peerId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ id: string; from_user_id: string; to_user_id: string; body: string; read: boolean; created_at: string }[]>(key);

      const tempMessage = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        from_user_id: userId,
        to_user_id: peerId,
        body: trimmed,
        read: false,
        created_at: new Date().toISOString(),
        __optimistic: true as const,
      };
      queryClient.setQueryData(key, [...(previous || []), tempMessage]);

      // Optimistically bump conversation preview too
      queryClient.setQueryData(["all_peer_messages", userId], (old: typeof previous) =>
        old ? [tempMessage, ...old] : [tempMessage]
      );

      // Return the draft so onError can restore what the user typed.
      return { previous, tempId: tempMessage.id, draftText: trimmed };
    },
    onError: (e: Error, _vars, ctx) => {
      // Rollback — restore previous cache + put text back so user can retry
      if (ctx?.previous && peerId && userId) {
        queryClient.setQueryData(["peer_messages", userId, peerId], ctx.previous);
      }
      if (ctx?.draftText) setMessageText((prev) => prev || ctx.draftText);
      toast.error(e.message);
    },
    onSuccess: (row, _vars, ctx) => {
      // In-place swap: replace the temp row with the canonical server row.
      // Avoids a refetch flicker that would make the bubble briefly disappear.
      if (!row || !ctx?.tempId || !peerId || !userId) return;
      const key = ["peer_messages", userId, peerId];
      queryClient.setQueryData<Array<{ id: string }>>(key, (old) =>
        old ? old.map((m) => (m.id === ctx.tempId ? { ...(row as { id: string }) } : m)) : old
      );
      queryClient.setQueryData<Array<{ id: string }>>(["all_peer_messages", userId], (old) =>
        old ? old.map((m) => (m.id === ctx.tempId ? { ...(row as { id: string }) } : m)) : old
      );
    },
    onSettled: () => {
      // Refresh conversation previews only; chat thread was already reconciled in onSuccess.
      queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
    },
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
