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
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.functions.invoke("livekit-token", {
        body: { room: call.room },
      });
      if (cancelled) return;
      if (error || !data?.token) {
        setError(error?.message || "Failed to get call token");
        toast.error("Failed to join call");
        return;
      }
      setToken(data.token);
      setUrl(data.url);
    })();
    return () => { cancelled = true; };
  }, [call.room]);

  const video = useMemo(() => call.kind === "video", [call.kind]);

  if (error) {
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center bg-background/95">
        <div className="text-center space-y-3">
          <p className="text-destructive">{error}</p>
          <button className="text-sm underline" onClick={onLeave}>Close</button>
        </div>
      </div>
    );
  }

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
        audio
        video={video}
        onDisconnected={onLeave}
        className="flex-1 flex flex-col"
      >
        <div className="flex-1 min-h-0">
          <Stage />
        </div>
        <RoomAudioRenderer />
        <ControlBar controls={{ microphone: true, camera: video, screenShare: false, leave: true }} />
      </LiveKitRoom>
    </div>
  );
}
