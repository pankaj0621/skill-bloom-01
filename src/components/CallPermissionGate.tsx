import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Video, PhoneOff, RefreshCw, Info, Loader2 } from "lucide-react";
import {
  requestMedia,
  stopStream,
  queryPermission,
  type MediaErrorKind,
  type PermissionKind,
} from "@/lib/mediaPermissions";

interface Props {
  /** What the call needs. "video" implies audio too. */
  kind: "audio" | "video";
  /** Called once permission is granted. Parent can then join LiveKit. */
  onReady: (opts: { audio: boolean; video: boolean }) => void;
  /** Called when the user cancels / bails out. */
  onCancel: () => void;
  /** Optional peer name for friendlier messaging. */
  peerName?: string;
}

const messageFor = (kind: MediaErrorKind, need: PermissionKind): { title: string; body: string; retryable: boolean } => {
  const device = need === "audio" ? "microphone" : need === "video" ? "camera" : "camera and microphone";
  switch (kind) {
    case "denied":
      return {
        title: "Permission blocked",
        body: `Access to your ${device} was blocked. Open the site permissions in your browser's address bar (🔒 icon) → allow ${device}, then tap Retry.`,
        retryable: true,
      };
    case "dismissed":
      return {
        title: "Permission needed",
        body: `We couldn't reach your ${device}. Tap Retry and choose "Allow" on the browser prompt.`,
        retryable: true,
      };
    case "no_device":
      return {
        title: "No device found",
        body: `No ${device} was detected on this device. ${need === "video" ? "You can still join with audio only." : ""}`,
        retryable: false,
      };
    case "in_use":
      return {
        title: "Device is busy",
        body: `Your ${device} is being used by another app or tab. Close it and tap Retry.`,
        retryable: true,
      };
    case "insecure":
      return {
        title: "Secure connection required",
        body: "Camera and microphone only work over HTTPS. Reload the app on the secure URL and try again.",
        retryable: false,
      };
    case "unsupported":
      return {
        title: "Browser not supported",
        body: "This browser doesn't support in-app calling. Try Chrome, Edge, Safari, or Firefox.",
        retryable: false,
      };
    default:
      return {
        title: "Couldn't start call",
        body: `Something went wrong reaching your ${device}. Tap Retry.`,
        retryable: true,
      };
  }
};

export default function CallPermissionGate({ kind, onReady, onCancel, peerName }: Props) {
  const need: PermissionKind = kind === "video" ? "both" : "audio";
  const [status, setStatus] = useState<"idle" | "requesting" | "error" | "granted">("idle");
  const [error, setError] = useState<MediaErrorKind | null>(null);
  const [audioOnlyFallback, setAudioOnlyFallback] = useState(false);

  const attempt = useCallback(async (target: PermissionKind) => {
    setStatus("requesting");
    setError(null);
    const res = await requestMedia(target);
    if (res.ok) {
      // We only wanted to confirm access — LiveKit will open its own tracks.
      stopStream(res.stream);
      setStatus("granted");
      onReady({
        audio: true,
        video: target === "both" || target === "video",
      });
      return;
    }
    setError(res.errorKind || "unknown");
    setStatus("error");
    // If the user is trying video and there is no camera, offer audio fallback automatically.
    if (target === "both" && res.errorKind === "no_device") {
      setAudioOnlyFallback(true);
    }
  }, [onReady]);

  // Kick off on mount. If perm is already denied at the OS/browser level we go straight to the error card.
  useEffect(() => {
    (async () => {
      const [mic, cam] = await Promise.all([
        queryPermission("audio"),
        need === "both" ? queryPermission("video") : Promise.resolve("granted" as const),
      ]);
      if (mic === "denied" || cam === "denied") {
        setError("denied");
        setStatus("error");
        return;
      }
      await attempt(need);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const msg = error ? messageFor(error, need) : null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-sm z-[300]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {kind === "video" ? <Video className="h-4 w-4 text-primary" /> : <Mic className="h-4 w-4 text-primary" />}
            {status === "requesting" && "Requesting permission…"}
            {status === "error" && (msg?.title || "Permission needed")}
            {status === "idle" && "Preparing call…"}
            {status === "granted" && "Connecting…"}
          </DialogTitle>
          <DialogDescription>
            {status === "requesting" && `Allow the browser prompt to call ${peerName || "your friend"}.`}
            {status === "error" && msg?.body}
            {(status === "idle" || status === "granted") && `Setting up your ${kind === "video" ? "camera & microphone" : "microphone"}…`}
          </DialogDescription>
        </DialogHeader>

        {status === "requesting" && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {status === "error" && (
          <div className="space-y-3">
            <div className="flex gap-2 rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                Tip: Look for the 🔒 icon next to the site URL → Site settings → set{" "}
                {need === "both" ? "Camera & Microphone" : "Microphone"} to Allow.
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {msg?.retryable && (
                <Button onClick={() => attempt(need)} className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Retry
                </Button>
              )}
              {audioOnlyFallback && kind === "video" && (
                <Button variant="secondary" onClick={() => attempt("audio")} className="gap-2">
                  <Mic className="h-4 w-4" /> Continue with audio only
                </Button>
              )}
              <Button variant="ghost" onClick={onCancel} className="gap-2">
                <PhoneOff className="h-4 w-4" /> Cancel call
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
