import { useEffect, useState } from "react";
import { getChatMediaUrl, formatBytes, type MediaKind } from "@/lib/chatMedia";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, FileText, Play, Loader2, ImageOff } from "lucide-react";

interface MediaAttachmentProps {
  path: string;
  mime: string | null;
  name: string | null;
  size: number | null;
  kind: MediaKind;
  isMine: boolean;
}

/** Inline attachment renderer for a chat bubble. */
export function MediaAttachment({ path, mime, name, size, kind, isMine }: MediaAttachmentProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getChatMediaUrl(path)
      .then((u) => { if (!cancelled) setUrl(u); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [path]);

  const bubbleTextColor = isMine ? "text-primary-foreground/80" : "text-muted-foreground";

  if (kind === "image") {
    return (
      <>
        <button
          type="button"
          onClick={() => url && setOpen(true)}
          className="block relative overflow-hidden rounded-xl bg-black/10 max-w-[240px] min-w-[140px] min-h-[140px]"
        >
          {url && !failed ? (
            <img
              src={url}
              alt={name || "Photo"}
              onError={() => setFailed(true)}
              className="max-h-[280px] w-auto object-cover"
              loading="lazy"
            />
          ) : failed ? (
            <div className="flex flex-col items-center justify-center gap-1 p-6 text-xs text-muted-foreground">
              <ImageOff className="h-6 w-6" /> Unable to load
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </button>
        <MediaLightbox open={open} onOpenChange={setOpen} url={url} kind="image" name={name || ""} />
      </>
    );
  }

  if (kind === "video") {
    return (
      <>
        <button
          type="button"
          onClick={() => url && setOpen(true)}
          className="relative block overflow-hidden rounded-xl bg-black max-w-[240px] min-w-[180px] min-h-[140px] group"
        >
          {url ? (
            <>
              <video
                src={url}
                muted
                playsInline
                preload="metadata"
                className="max-h-[280px] w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/35 transition-colors">
                <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play className="h-6 w-6 text-black translate-x-0.5" fill="currentColor" />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-5 w-5 animate-spin text-white/80" />
            </div>
          )}
        </button>
        <MediaLightbox open={open} onOpenChange={setOpen} url={url} kind="video" name={name || ""} />
      </>
    );
  }

  if (kind === "audio") {
    return (
      <div className="min-w-[220px]">
        {url ? (
          <audio src={url} controls preload="metadata" className="w-full max-w-[260px] h-10" />
        ) : (
          <div className="flex items-center gap-2 py-2 text-xs">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading audio…
          </div>
        )}
        {name && <p className={`text-[11px] mt-1 truncate ${bubbleTextColor}`}>{name}</p>}
      </div>
    );
  }

  // Generic file card
  return (
    <a
      href={url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      download={name || undefined}
      onClick={(e) => { if (!url) e.preventDefault(); }}
      className={`flex items-center gap-2 rounded-xl border border-current/20 px-3 py-2 min-w-[220px] max-w-[260px] transition-colors ${
        isMine ? "bg-primary-foreground/10 hover:bg-primary-foreground/15" : "bg-background/60 hover:bg-background/80"
      }`}
    >
      <div className="h-9 w-9 rounded-lg bg-current/10 flex items-center justify-center flex-shrink-0">
        <FileText className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{name || "File"}</p>
        <p className={`text-[10px] ${bubbleTextColor}`}>
          {size ? formatBytes(size) : mime || "File"}
        </p>
      </div>
      <Download className="h-4 w-4 flex-shrink-0 opacity-70" />
    </a>
  );
}

/** Fullscreen viewer for images and videos. */
export function MediaLightbox({
  open,
  onOpenChange,
  url,
  kind,
  name,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  url: string | null;
  kind: "image" | "video";
  name: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[100vw] w-screen h-[100dvh] p-0 border-0 bg-black/95 rounded-none z-[400] flex items-center justify-center"
        aria-describedby={undefined}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 right-3 text-white hover:bg-white/10 z-10 h-10 w-10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </Button>
        {url && (
          <a
            href={url}
            download={name || undefined}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-3 right-16 z-10 h-10 w-10 inline-flex items-center justify-center rounded-md text-white hover:bg-white/10"
            aria-label="Download"
          >
            <Download className="h-5 w-5" />
          </a>
        )}
        <div className="w-full h-full flex items-center justify-center p-4">
          {!url ? (
            <Loader2 className="h-8 w-8 animate-spin text-white/70" />
          ) : kind === "image" ? (
            <img src={url} alt={name} className="max-w-full max-h-full object-contain" />
          ) : (
            <video
              src={url}
              controls
              autoPlay
              playsInline
              className="max-w-full max-h-full"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
