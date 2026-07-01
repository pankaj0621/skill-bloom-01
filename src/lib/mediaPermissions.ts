/**
 * Media permissions helper.
 *
 * Wraps the Permissions API + getUserMedia so callers can:
 *   - check state without prompting (query)
 *   - actively request access (request) and get a stable error kind
 *   - clean up any tracks that were opened just for the preflight
 *
 * Browsers behave differently:
 *   - Chrome / Edge: Permissions API works for camera & microphone.
 *   - Safari: Permissions API often unsupported → we fall back to a live probe.
 *   - Firefox: microphone/camera not always exposed to Permissions API.
 */

export type PermissionKind = "audio" | "video" | "both";
export type PermissionState = "granted" | "denied" | "prompt" | "unknown";

export type MediaErrorKind =
  | "denied"           // user (or policy) refused
  | "dismissed"        // prompt dismissed without a choice
  | "no_device"        // no camera/mic on the machine
  | "in_use"           // hardware busy in another tab/app
  | "insecure"         // page not on https / localhost
  | "unsupported"      // browser missing mediaDevices
  | "unknown";

export interface MediaRequestResult {
  ok: boolean;
  stream?: MediaStream;
  errorKind?: MediaErrorKind;
  errorMessage?: string;
}

const isSecure = () =>
  typeof window !== "undefined" &&
  (window.isSecureContext || location.hostname === "localhost" || location.hostname === "127.0.0.1");

const hasMediaDevices = () =>
  typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/** Non-prompting check. Returns "unknown" when the browser can't tell us. */
export async function queryPermission(kind: "audio" | "video"): Promise<PermissionState> {
  try {
    if (!("permissions" in navigator)) return "unknown";
    const name = kind === "audio" ? "microphone" : "camera";
    // TS lib doesn't know these names on all targets.
    const status = await (navigator.permissions as unknown as {
      query: (d: { name: string }) => Promise<{ state: PermissionState }>;
    }).query({ name });
    return (status.state as PermissionState) || "unknown";
  } catch {
    return "unknown";
  }
}

function classifyError(err: unknown): MediaErrorKind {
  const e = err as { name?: string; message?: string } | undefined;
  const name = e?.name || "";
  const msg = (e?.message || "").toLowerCase();

  if (name === "NotAllowedError" || name === "SecurityError") {
    if (msg.includes("dismissed")) return "dismissed";
    return "denied";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no_device";
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") return "in_use";
  return "unknown";
}

export async function requestMedia(kind: PermissionKind): Promise<MediaRequestResult> {
  if (!isSecure()) {
    return { ok: false, errorKind: "insecure", errorMessage: "Camera/mic require a secure (HTTPS) connection." };
  }
  if (!hasMediaDevices()) {
    return { ok: false, errorKind: "unsupported", errorMessage: "This browser does not support camera/mic access." };
  }

  const wantsAudio = kind === "audio" || kind === "both";
  const wantsVideo = kind === "video" || kind === "both";

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: wantsAudio,
      video: wantsVideo,
    });
    return { ok: true, stream };
  } catch (err) {
    return {
      ok: false,
      errorKind: classifyError(err),
      errorMessage: (err as Error)?.message || "Unable to access media devices.",
    };
  }
}

export function stopStream(stream?: MediaStream | null) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    /* noop */
  }
}

/** True when running inside a webview/browser that reliably supports getUserMedia. */
export function mediaLikelySupported(): boolean {
  return isSecure() && hasMediaDevices();
}
