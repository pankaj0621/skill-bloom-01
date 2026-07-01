import { useEffect, useMemo, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useTracks,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Track, MediaDeviceFailure } from "livekit-client";
import "@livekit/components-styles";
import { Loader2, PhoneOff, X } from "lucide-react";
import { toast } from "sonner";
import CallPermissionGate from "@/components/CallPermissionGate";
import CallQualityIndicator from "@/components/CallQualityIndicator";

interface Props {
  call: {
    signalId: string;
    room: string;
    peerId: string;
    peerName: string;
    kind: "audio" | "video";
    role: "caller" | "callee";
  };
  onLeave: () => void;
}

function Stage() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  return (
    <GridLayout tracks={tracks} className="h-full">
      <ParticipantTile />
    </GridLayout>
  );
}

/** Floating end-call button that is ALWAYS on top and always clickable —
 *  survives even if the LiveKit UI freezes or fails to render controls. */
function FloatingEndButton({ onLeave }: { onLeave: () => void }) {
  return (
    <button
      type="button"
      onClick={onLeave}
      aria-label="End call"
      className="fixed top-3 right-3 z-[400] flex items-center gap-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 text-xs font-semibold shadow-lg active:scale-95 transition"
      style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)" }}
    >
      <PhoneOff className="h-4 w-4" />
      End
    </button>
  );
}

export default function CallRoom({ call, onLeave }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permReady, setPermReady] = useState<{ audio: boolean; video: boolean } | null>(null);
  const [connectStuck, setConnectStuck] = useState(false);
  const stuckTimerRef = useRef<number | null>(null);

  // Fetch LiveKit token as soon as we mount — parallel to permission prompt.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("livekit-token", {
          body: { room: call.room },
        });
        if (cancelled) return;
        if (error || !data?.token) {
          setError(error?.message || "Failed to get call token");
          return;
        }
        setToken(data.token);
        setUrl(data.url);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [call.room]);

  // Global Escape → end call. Never let the modal trap the user.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onLeave(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onLeave]);

  // If we haven't fully connected within 25s, surface a "stuck" banner
  // with a big obvious End button.
  useEffect(() => {
    if (permReady && token && url) {
      stuckTimerRef.current = window.setTimeout(() => setConnectStuck(true), 25000);
    }
    return () => {
      if (stuckTimerRef.current) window.clearTimeout(stuckTimerRef.current);
    };
  }, [permReady, token, url]);

  const wantVideo = useMemo(() => call.kind === "video", [call.kind]);

  // Error → show clean fallback card with an always-clickable close.
  if (error) {
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center bg-background/95">
        <FloatingEndButton onLeave={onLeave} />
        <div className="text-center space-y-3 p-6">
          <p className="text-destructive font-medium">{error}</p>
          <button className="text-sm underline text-muted-foreground" onClick={onLeave}>Close</button>
        </div>
      </div>
    );
  }

  // Step 1 — permission gate.
  if (!permReady) {
    return (
      <CallPermissionGate
        kind={call.kind}
        peerName={call.peerName}
        onReady={(p) => setPermReady(p)}
        onCancel={onLeave}
      />
    );
  }

  // Step 2 — waiting for token.
  if (!token || !url) {
    return (
      <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center gap-3 bg-background/95">
        <FloatingEndButton onLeave={onLeave} />
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Connecting to {call.peerName}…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[250] bg-black flex flex-col overflow-hidden" data-lk-theme="default">
      {/* Guaranteed escape hatch — always on top, always clickable */}
      <FloatingEndButton onLeave={onLeave} />

      {connectStuck && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[350] bg-background/95 border border-border rounded-lg shadow-lg px-3 py-2 flex items-center gap-2 max-w-[92vw]">
          <span className="text-xs text-foreground">Taking longer than expected…</span>
          <button
            className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-400"
            onClick={onLeave}
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      )}

      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect
        audio={permReady.audio}
        video={wantVideo && permReady.video}
        onConnected={() => setConnectStuck(false)}
        onDisconnected={onLeave}
        onError={(e) => {
          toast.error(e?.message || "Call error");
        }}
        onMediaDeviceFailure={(failure) => {
          if (failure === MediaDeviceFailure.PermissionDenied) toast.error("Camera/mic permission was revoked");
          else if (failure === MediaDeviceFailure.NotFound) toast.error("No camera or microphone found");
          else if (failure === MediaDeviceFailure.DeviceInUse) toast.error("Camera/mic is being used by another app");
          else toast.error("Media device error");
        }}
        className="flex-1 flex flex-col min-h-0"
      >
        {/* Live network quality pill — top-left, always visible during the call */}
        <div className="absolute top-3 left-3 z-[340]">
          <CallQualityIndicator />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <Stage />
        </div>
        <RoomAudioRenderer />
        <div
          className="flex-shrink-0 bg-black/90 border-t border-white/10"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.25rem)" }}
        >
          <ControlBar
            controls={{
              microphone: true,
              camera: wantVideo && permReady.video,
              screenShare: false,
              leave: true,
            }}
          />
        </div>
      </LiveKitRoom>
    </div>
  );
}
