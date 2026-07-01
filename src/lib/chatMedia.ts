import { supabase } from "@/integrations/supabase/client";

export type MediaKind = "image" | "video" | "audio" | "file";

export interface UploadedMedia {
  path: string;
  mime: string;
  name: string;
  size: number;
  kind: MediaKind;
  duration_ms?: number;
}

/** 100 MB — chosen limit per product spec. */
export const MAX_MEDIA_BYTES = 100 * 1024 * 1024;

export function kindFromMime(mime: string, filename?: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  // Some browsers report empty mime for .heic etc. — fall back to extension.
  const ext = (filename || "").split(".").pop()?.toLowerCase();
  if (ext && ["png", "jpg", "jpeg", "webp", "gif", "avif", "heic"].includes(ext)) return "image";
  if (ext && ["mp4", "mov", "webm", "mkv"].includes(ext)) return "video";
  if (ext && ["mp3", "wav", "ogg", "m4a", "aac"].includes(ext)) return "audio";
  return "file";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Try to read audio/video duration client-side (best-effort). */
async function readDuration(file: File, kind: MediaKind): Promise<number | undefined> {
  if (kind !== "video" && kind !== "audio") return undefined;
  return new Promise((resolve) => {
    try {
      const el = document.createElement(kind === "video" ? "video" : "audio");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        const d = el.duration && isFinite(el.duration) ? Math.round(el.duration * 1000) : undefined;
        URL.revokeObjectURL(el.src);
        resolve(d);
      };
      el.onerror = () => resolve(undefined);
      el.src = URL.createObjectURL(file);
    } catch {
      resolve(undefined);
    }
  });
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]+/g, "_").slice(0, 120) || "file";
}

export async function uploadChatMedia(userId: string, file: File): Promise<UploadedMedia> {
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error(`File too large. Max ${formatBytes(MAX_MEDIA_BYTES)}.`);
  }
  const kind = kindFromMime(file.type, file.name);
  const messageDir = crypto.randomUUID();
  const filename = sanitizeFilename(file.name);
  const path = `${userId}/${messageDir}/${filename}`;

  const { error } = await supabase.storage
    .from("chat-media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
  if (error) throw error;

  const duration_ms = await readDuration(file, kind);

  return {
    path,
    mime: file.type || "application/octet-stream",
    name: file.name,
    size: file.size,
    kind,
    duration_ms,
  };
}

// ─── Signed URL cache — private bucket, short-lived signed URLs ────────
const urlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGN_TTL_SECONDS = 60 * 60; // 1 hour

export async function getChatMediaUrl(path: string): Promise<string> {
  const cached = urlCache.get(path);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.url;
  const { data, error } = await supabase.storage
    .from("chat-media")
    .createSignedUrl(path, SIGN_TTL_SECONDS);
  if (error || !data) throw error || new Error("Sign failed");
  urlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + SIGN_TTL_SECONDS * 1000 });
  return data.signedUrl;
}

// ─── Disappearing-message options ──────────────────────────────────────
export interface DisappearOption {
  seconds: number | null;
  label: string;
}

export const DISAPPEAR_OPTIONS: DisappearOption[] = [
  { seconds: null, label: "Off" },
  { seconds: 60, label: "1 minute" },
  { seconds: 60 * 60, label: "1 hour" },
  { seconds: 24 * 60 * 60, label: "24 hours" },
  { seconds: 7 * 24 * 60 * 60, label: "7 days" },
  { seconds: 90 * 24 * 60 * 60, label: "90 days" },
];

export function disappearLabel(seconds: number | null | undefined): string {
  if (!seconds) return "Off";
  const opt = DISAPPEAR_OPTIONS.find((o) => o.seconds === seconds);
  if (opt) return opt.label;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export function timeUntil(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
