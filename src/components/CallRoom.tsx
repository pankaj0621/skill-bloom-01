import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  ControlBar,
  useTracks,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Track, RoomEvent, MediaDeviceFailure } from "livekit-client";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import CallPermissionGate from "@/components/CallPermissionGate";

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

export default function CallRoom({ call, onLeave }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permReady, setPermReady] = useState<{ audio: boolean; video: boolean } | null>(null);

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

  const wantVideo = useMemo(() => call.kind === "video", [call.kind]);

  // Show error card if token failed.
  if (error) {
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center bg-background/95">
        <div className="text-center space-y-3 p-6">
          <p className="text-destructive font-medium">{error}</p>
          <button className="text-sm underline text-muted-foreground" onClick={onLeave}>Close</button>
        </div>
      </div>
    );
  }

  // Step 1 — permission gate. Must run before LiveKit tries to open tracks
  // (LiveKit crashes hard if getUserMedia is denied mid-connect).
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

  // Step 2 — wait for token before rendering the room.
  if (!token || !url) {
    return (
      <div className="fixed inset-0 z-[250] flex flex-col items-center justify-center gap-3 bg-background/95">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Connecting to {call.peerName}…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[250] bg-black flex flex-col" data-lk-theme="default">
      <LiveKitRoom
        token={token}
        serverUrl={url}
        connect
        audio={permReady.audio}
        video={wantVideo && permReady.video}
        onDisconnected={onLeave}
        onError={(e) => {
          toast.error(e?.message || "Call error");
        }}
        onMediaDeviceFailure={(failure) => {
          if (failure === MediaDeviceFailure.PermissionDenied) {
            toast.error("Camera/mic permission was revoked");
          } else if (failure === MediaDeviceFailure.NotFound) {
            toast.error("No camera or microphone found");
          } else if (failure === MediaDeviceFailure.DeviceInUse) {
            toast.error("Camera/mic is being used by another app");
          } else {
            toast.error("Media device error");
          }
        }}
        className="flex-1 flex flex-col"
      >
        <div className="flex-1 min-h-0">
          <Stage />
        </div>
        <RoomAudioRenderer />
        <ControlBar
          controls={{
            microphone: true,
            camera: wantVideo && permReady.video,
            screenShare: false,
            leave: true,
          }}
        />
      </LiveKitRoom>
    </div>
  );
}
