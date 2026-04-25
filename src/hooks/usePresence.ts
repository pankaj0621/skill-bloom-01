import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ─── Online / Offline Presence ───

const presenceChannelRef: { current: RealtimeChannel | null } = { current: null };
const onlineUsersState: { current: Set<string>; listeners: Set<() => void> } = {
  current: new Set(),
  listeners: new Set(),
};

function notifyListeners() {
  onlineUsersState.listeners.forEach((fn) => fn());
}

export function usePresence(userId: string | undefined) {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const rerender = () => forceUpdate((n) => n + 1);
    onlineUsersState.listeners.add(rerender);

    if (!userId) {
      // User logged out — tear down the presence channel
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
        onlineUsersState.current = new Set();
        notifyListeners();
      }
      return () => {
        onlineUsersState.listeners.delete(rerender);
      };
    }

    // Only create one global presence channel, but re-create if userId changed
    if (!presenceChannelRef.current) {
      const channel = supabase.channel("online-users", {
        config: { presence: { key: userId } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const ids = new Set<string>();
          Object.keys(state).forEach((key) => ids.add(key));
          onlineUsersState.current = ids;
          notifyListeners();
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            await channel.track({ user_id: userId, online_at: new Date().toISOString() });
          }
        });

      presenceChannelRef.current = channel;
    } else {
      // Already subscribed, re-track with current userId (handles login swap)
      presenceChannelRef.current.track({ user_id: userId, online_at: new Date().toISOString() });
    }

    return () => {
      onlineUsersState.listeners.delete(rerender);
    };
  }, [userId]);

  const isOnline = useCallback(
    (targetId: string) => onlineUsersState.current.has(targetId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onlineUsersState.current.size]
  );

  return { isOnline };
}

// ─── Typing Indicator ───

export function useTypingIndicator(userId: string | undefined, peerId: string | null) {
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastBroadcast = useRef(0);

  useEffect(() => {
    if (!userId || !peerId) return;

    // Create a unique channel per conversation pair (sorted IDs for consistency)
    const ids = [userId, peerId].sort();
    const channelName = `typing-${ids[0]}-${ids[1]}`;

    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.user_id === peerId) {
          setPeerIsTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setPeerIsTyping(false), 3000);
        }
      })
      .subscribe();

    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, peerId]);

  const broadcastTyping = useCallback(() => {
    if (!channelRef.current || !userId) return;
    const now = Date.now();
    // Throttle to once per second
    if (now - lastBroadcast.current < 1000) return;
    lastBroadcast.current = now;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { user_id: userId },
    });
  }, [userId]);

  return { peerIsTyping, broadcastTyping };
}
