import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CallRoom from "@/components/CallRoom";
import IncomingCallDialog from "@/components/IncomingCallDialog";

export type CallKind = "audio" | "video";

interface ActiveCall {
  signalId: string;
  room: string;
  peerId: string;
  peerName: string;
  peerAvatarUrl?: string | null;
  kind: CallKind;
  role: "caller" | "callee";
}

interface IncomingCall extends ActiveCall {}

interface CallContextValue {
  startCall: (opts: { peerId: string; peerName: string; peerAvatarUrl?: string | null; kind: CallKind }) => Promise<void>;
  activeCall: ActiveCall | null;
  incoming: IncomingCall | null;
  endCall: (status?: "ended" | "cancelled" | "declined" | "missed") => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => Promise<void>;
}

const CallContext = createContext<CallContextValue | null>(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used within CallProvider");
  return ctx;
};

const roomIdFor = (a: string, b: string) => {
  const [x, y] = [a, b].sort();
  return `dm-${x}-${y}-${Date.now().toString(36)}`;
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  // Realtime: listen for signals directed at me
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`call-signals-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_signals", filter: `to_user_id=eq.${user.id}` },
        async (payload) => {
          const s = payload.new as { id: string; room: string; from_user_id: string; kind: CallKind; status: string };
          if (s.status !== "ringing") return;
          // Fetch peer info
          const { data: prof } = await supabase.from("profiles").select("display_name, avatar_url").eq("id", s.from_user_id).single();
          setIncoming({
            signalId: s.id,
            room: s.room,
            peerId: s.from_user_id,
            peerName: prof?.display_name || "Someone",
            peerAvatarUrl: prof?.avatar_url,
            kind: s.kind,
            role: "callee",
          });
        })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_signals" },
        (payload) => {
          const s = payload.new as { id: string; status: string; from_user_id: string; to_user_id: string };
          if (s.from_user_id !== user.id && s.to_user_id !== user.id) return;

          setIncoming((cur) => (cur && cur.signalId === s.id && s.status !== "ringing") ? null : cur);
          setActiveCall((cur) => {
            if (!cur || cur.signalId !== s.id) return cur;
            if (["ended", "declined", "cancelled", "missed"].includes(s.status)) {
              toast.info(s.status === "declined" ? "Call declined" : "Call ended");
              return null;
            }
            return cur;
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Auto-miss after 40s for incoming
  useEffect(() => {
    if (!incoming) return;
    const t = setTimeout(async () => {
      await supabase.from("call_signals").update({ status: "missed" }).eq("id", incoming.signalId).eq("status", "ringing");
      setIncoming(null);
    }, 40000);
    return () => clearTimeout(t);
  }, [incoming]);

  const startCall: CallContextValue["startCall"] = useCallback(async ({ peerId, peerName, peerAvatarUrl, kind }) => {
    if (!user) return;
    if (activeCall) { toast.error("Already in a call"); return; }
    const room = roomIdFor(user.id, peerId);
    const { data, error } = await supabase.from("call_signals").insert({
      from_user_id: user.id, to_user_id: peerId, kind, room, status: "ringing",
    }).select("id").single();
    if (error || !data) { toast.error("Failed to start call"); return; }
    setActiveCall({ signalId: data.id, room, peerId, peerName, peerAvatarUrl, kind, role: "caller" });
  }, [user, activeCall]);

  const endCall = useCallback(async (status: "ended" | "cancelled" | "declined" | "missed" = "ended") => {
    const cur = activeCall;
    // Close UI immediately so the hangup button is never "stuck" waiting on the network.
    setActiveCall(null);
    if (!cur) return;
    try {
      await supabase.from("call_signals").update({ status }).eq("id", cur.signalId);
    } catch {
      /* best-effort — UI already closed */
    }
  }, [activeCall]);

  const acceptCall = useCallback(async () => {
    if (!incoming) return;
    const { error } = await supabase.from("call_signals").update({ status: "accepted" }).eq("id", incoming.signalId);
    if (error) { toast.error("Failed to accept"); return; }
    setActiveCall(incoming);
    setIncoming(null);
  }, [incoming]);

  const declineCall = useCallback(async () => {
    if (!incoming) return;
    await supabase.from("call_signals").update({ status: "declined" }).eq("id", incoming.signalId);
    setIncoming(null);
  }, [incoming]);

  return (
    <CallContext.Provider value={{ startCall, activeCall, incoming, endCall, acceptCall, declineCall }}>
      {children}
      {incoming && (
        <IncomingCallDialog
          peerName={incoming.peerName}
          peerAvatarUrl={incoming.peerAvatarUrl}
          kind={incoming.kind}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}
      {activeCall && <CallRoom call={activeCall} onLeave={() => endCall("ended")} />}
      <audio ref={ringtoneRef} src="" />
    </CallContext.Provider>
  );
};
