import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { playMessageSound } from "@/lib/sounds";
import type { UploadedMedia } from "@/lib/chatMedia";

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

    const now = Date.now();
    for (const msg of allMessages) {
      // Hide messages the current user deleted for themselves.
      const deletedForMe = (msg as { deleted_for_user_ids?: string[] }).deleted_for_user_ids?.includes(userId);
      if (deletedForMe) continue;
      // Hide expired messages (disappearing).
      const expiresAt = (msg as { expires_at?: string | null }).expires_at;
      if (expiresAt && new Date(expiresAt).getTime() <= now) continue;

      const isDeletedForAll = (msg as { deleted_for_everyone?: boolean }).deleted_for_everyone;
      const mediaKind = (msg as { media_kind?: string | null }).media_kind;
      let preview: string;
      if (isDeletedForAll) preview = "🚫 This message was deleted";
      else if (msg.body && msg.body.length > 0) preview = msg.body;
      else if (mediaKind === "image") preview = "📷 Photo";
      else if (mediaKind === "video") preview = "🎥 Video";
      else if (mediaKind === "audio") preview = "🎵 Audio";
      else if (mediaKind === "file") preview = "📎 File";
      else preview = "";

      const peerId = msg.from_user_id === userId ? msg.to_user_id : msg.from_user_id;
      if (!map.has(peerId)) {
        const profile = peerProfiles.find((p) => p.id === peerId);
        map.set(peerId, {
          peerId,
          peerName: profile?.display_name || "Student",
          peerLevel: profile?.computed_level || "Beginner",
          peerAvatarUrl: profile?.avatar_url || null,
          peerUsername: profile?.username || null,
          lastMessage: preview,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
        });
      }
      const conv = map.get(peerId)!;
      if (msg.to_user_id === userId && !msg.read && !isDeletedForAll) {
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
      // Best-effort: purge expired disappearing messages the current user
      // participates in. Failure is non-fatal — client also filters below.
      supabase.rpc("cleanup_expired_peer_messages").then(() => {
        queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
      });

      const { data, error } = await supabase
        .from("peer_messages")
        .select("*")
        .or(
          `and(from_user_id.eq.${userId},to_user_id.eq.${peerId}),and(from_user_id.eq.${peerId},to_user_id.eq.${userId})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      const now = Date.now();
      return (data || []).filter((m) => {
        if (userId && (m as { deleted_for_user_ids?: string[] }).deleted_for_user_ids?.includes(userId)) return false;
        const exp = (m as { expires_at?: string | null }).expires_at;
        if (exp && new Date(exp).getTime() <= now) return false;
        return true;
      });
    },
    enabled: !!userId && !!peerId,
    // Poll frequently so per-message timers actually disappear without user
    // interaction. Cheap because it's a single indexed query.
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (!userId || !peerId || !messages) return;
    const hasUnread = messages.some(
      (m) => m.to_user_id === userId && m.from_user_id === peerId && !m.read
    );
    if (!hasUnread) return;
    // Use RPC so the server can also stamp expires_at for disappearing
    // messages — the timer starts when the recipient actually sees them.
    (supabase.rpc as unknown as (fn: string, args: Record<string, string>) => Promise<unknown>)(
      "mark_peer_messages_read",
      { _from: peerId, _to: userId }
    )
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["peer_messages", userId, peerId] });
        queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
        queryClient.invalidateQueries({ queryKey: ["unread_peer_messages"] });
      });
  }, [userId, peerId, messages, queryClient]);

  return { messages };
}

export interface SendMessagePayload {
  media?: UploadedMedia;
  /** Per-message override; falls back to chat default. NULL/0 = no expiry. */
  disappearSeconds?: number | null;
}

export function useSendMessage(userId: string | undefined, peerId: string | null) {
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState("");

  const sendMessage = useMutation({
    mutationFn: async (payload: SendMessagePayload | void) => {
      const opts: SendMessagePayload = payload || {};
      const trimmed = messageText.trim();
      if (!peerId) return null;
      const hasBody = trimmed.length > 0;
      const hasMedia = !!opts.media;
      if (!hasBody && !hasMedia) return null;
      if (trimmed.length > 5000) throw new Error("Message must be 5000 characters or fewer");

      const disappearSeconds = opts.disappearSeconds ?? null;
      // NOTE: expires_at is intentionally NOT set at send time. The timer
      // starts only after the recipient reads the message (see
      // mark_peer_messages_read RPC), so it doesn't vanish before they see it.
      const insertRow: Record<string, unknown> = {
        from_user_id: userId!,
        to_user_id: peerId,
        body: trimmed,
        disappear_seconds: disappearSeconds,
        expires_at: null,
      };
      if (opts.media) {
        insertRow.media_path = opts.media.path;
        insertRow.media_mime = opts.media.mime;
        insertRow.media_name = opts.media.name;
        insertRow.media_size = opts.media.size;
        insertRow.media_kind = opts.media.kind;
        if (opts.media.duration_ms) insertRow.media_duration_ms = opts.media.duration_ms;
      }

      const { data, error } = await supabase
        .from("peer_messages")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(insertRow as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (payload: SendMessagePayload | void) => {
      const opts: SendMessagePayload = payload || {};
      const trimmed = messageText.trim();
      if (!peerId || !userId) return;
      if (!trimmed && !opts.media) return;
      setMessageText("");

      const key = ["peer_messages", userId, peerId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Array<Record<string, unknown>>>(key);

      const disappearSeconds = opts.disappearSeconds ?? null;

      const tempMessage: Record<string, unknown> = {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        from_user_id: userId,
        to_user_id: peerId,
        body: trimmed,
        read: false,
        created_at: new Date().toISOString(),
        expires_at: null,
        disappear_seconds: disappearSeconds,
        media_path: opts.media?.path ?? null,
        media_mime: opts.media?.mime ?? null,
        media_name: opts.media?.name ?? null,
        media_size: opts.media?.size ?? null,
        media_kind: opts.media?.kind ?? null,
        media_duration_ms: opts.media?.duration_ms ?? null,
        __optimistic: true,
      };
      queryClient.setQueryData(key, [...(previous || []), tempMessage]);
      queryClient.setQueryData(["all_peer_messages", userId], (old: typeof previous) =>
        old ? [tempMessage, ...old] : [tempMessage]
      );

      return { previous, tempId: tempMessage.id as string, draftText: trimmed };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.previous && peerId && userId) {
        queryClient.setQueryData(["peer_messages", userId, peerId], ctx.previous);
      }
      if (ctx?.draftText) setMessageText((prev) => prev || ctx.draftText);
      toast.error(e.message);
    },
    onSuccess: (row, _vars, ctx) => {
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
      queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
    },
  });

  return { messageText, setMessageText, sendMessage };
}

export function useEditMessage(userId: string | undefined, peerId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, newBody }: { messageId: string; newBody: string }) => {
      const trimmed = newBody.trim();
      if (!trimmed) throw new Error("Message cannot be empty");
      if (trimmed.length > 5000) throw new Error("Message must be 5000 characters or fewer");
      const { error } = await supabase
        .from("peer_messages")
        .update({ body: trimmed })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peer_messages", userId, peerId] });
      queryClient.invalidateQueries({ queryKey: ["all_peer_messages", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteMessage(userId: string | undefined, peerId: string | null) {
  const queryClient = useQueryClient();

  const deleteForEveryone = useMutation({
    mutationFn: async (messageId: string) => {
      const { error } = await supabase
        .from("peer_messages")
        .update({ deleted_for_everyone: true })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peer_messages", userId, peerId] });
      queryClient.invalidateQueries({ queryKey: ["all_peer_messages", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteForMe = useMutation({
    mutationFn: async ({ messageId, existing }: { messageId: string; existing: string[] }) => {
      if (!userId) throw new Error("Not signed in");
      const next = Array.from(new Set([...(existing || []), userId]));
      const { error } = await supabase
        .from("peer_messages")
        .update({ deleted_for_user_ids: next })
        .eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peer_messages", userId, peerId] });
      queryClient.invalidateQueries({ queryKey: ["all_peer_messages", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { deleteForEveryone, deleteForMe };
}

export function formatMessageTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

