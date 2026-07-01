import { useEffect, useMemo, useState } from "react";
import {
  useLocalParticipant,
  useConnectionQualityIndicator,
  useRoomContext,
} from "@livekit/components-react";
import { ConnectionQuality, Track } from "livekit-client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SignalHigh, SignalMedium, SignalLow, SignalZero, VideoOff } from "lucide-react";
import { toast } from "sonner";

interface Stats {
  rttMs: number | null;      // round-trip time
  lossPct: number | null;    // outbound packet loss %
  upKbps: number | null;     // upstream bitrate
  downKbps: number | null;   // downstream bitrate
}

const emptyStats: Stats = { rttMs: null, lossPct: null, upKbps: null, downKbps: null };

const qualityMeta = (q: ConnectionQuality) => {
  switch (q) {
    case ConnectionQuality.Excellent:
      return { label: "Excellent", color: "text-emerald-400", Icon: SignalHigh, ring: "bg-emerald-500/20" };
    case ConnectionQuality.Good:
      return { label: "Good", color: "text-yellow-400", Icon: SignalMedium, ring: "bg-yellow-500/20" };
    case ConnectionQuality.Poor:
      return { label: "Poor", color: "text-orange-400", Icon: SignalLow, ring: "bg-orange-500/20" };
    case ConnectionQuality.Lost:
      return { label: "Lost", color: "text-red-500", Icon: SignalZero, ring: "bg-red-500/20" };
    default:
      return { label: "Unknown", color: "text-muted-foreground", Icon: SignalMedium, ring: "bg-muted/20" };
  }
};

export default function CallQualityIndicator() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const { quality } = useConnectionQualityIndicator(localParticipant);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [warnedPoor, setWarnedPoor] = useState(false);

  const meta = useMemo(() => qualityMeta(quality), [quality]);

  // Poll WebRTC stats every 3s. Cheap and enough for a visible signal.
  useEffect(() => {
    if (!localParticipant) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const pubs = Array.from(localParticipant.trackPublications.values());
        let rtt: number | null = null;
        let lostPackets = 0;
        let sentPackets = 0;
        let upBps = 0;

        for (const pub of pubs) {
          const track = pub.track;
          if (!track) continue;
          const report = await track.getRTCStatsReport().catch(() => null);
          if (!report) continue;
          report.forEach((r: unknown) => {
            const s = r as {
              type?: string;
              packetsLost?: number;
              packetsSent?: number;
              bytesSent?: number;
              timestamp?: number;
              currentRoundTripTime?: number;
            };
            if (s.type === "outbound-rtp") {
              lostPackets += s.packetsLost || 0;
              sentPackets += s.packetsSent || 0;
              upBps += (s.bytesSent || 0) * 8;
            }
            if (s.type === "candidate-pair" && s.currentRoundTripTime != null) {
              rtt = Math.round(s.currentRoundTripTime * 1000);
            }
          });
        }

        // Downstream from remote participants (subscribed inbound-rtp).
        let downBps = 0;
        for (const rp of Array.from(room?.remoteParticipants.values() || [])) {
          for (const pub of Array.from(rp.trackPublications.values())) {
            const track = pub.track;
            if (!track) continue;
            const report = await track.getRTCStatsReport().catch(() => null);
            if (!report) continue;
            report.forEach((r: unknown) => {
              const s = r as { type?: string; bytesReceived?: number };
              if (s.type === "inbound-rtp") downBps += (s.bytesReceived || 0) * 8;
            });
          }
        }

        if (cancelled) return;
        setStats((prev) => {
          // Convert cumulative bytes → rough kbps by comparing with previous tick.
          const now = performance.now();
          const anyPrev = prev as Stats & { _t?: number; _up?: number; _down?: number };
          const dt = anyPrev._t ? (now - anyPrev._t) / 1000 : 0;
          const upKbps = dt > 0 && anyPrev._up != null ? Math.max(0, Math.round((upBps - anyPrev._up) / dt / 1000)) : null;
          const downKbps = dt > 0 && anyPrev._down != null ? Math.max(0, Math.round((downBps - anyPrev._down) / dt / 1000)) : null;
          const lossPct = sentPackets > 0 ? Math.round((lostPackets / (sentPackets + lostPackets)) * 1000) / 10 : null;
          const next: Stats & { _t?: number; _up?: number; _down?: number } = {
            rttMs: rtt,
            lossPct,
            upKbps,
            downKbps,
            _t: now,
            _up: upBps,
            _down: downBps,
          };
          return next;
        });
      } catch {
        /* ignore transient stats errors */
      }
    };

    tick();
    const id = window.setInterval(tick, 3000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [localParticipant, room]);

  // One-shot toast when quality drops to Poor, with a quick action to disable video.
  useEffect(() => {
    if (quality === ConnectionQuality.Poor && !warnedPoor) {
      setWarnedPoor(true);
      toast.warning("Weak connection — try turning off video or switching network.", {
        duration: 6000,
        action: localParticipant?.isCameraEnabled
          ? {
              label: "Turn off video",
              onClick: () => localParticipant?.setCameraEnabled(false).catch(() => {}),
            }
          : undefined,
      });
    }
    if (quality === ConnectionQuality.Excellent || quality === ConnectionQuality.Good) {
      setWarnedPoor(false);
    }
  }, [quality, warnedPoor, localParticipant]);

  const Icon = meta.Icon;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Connection quality: ${meta.label}`}
          className={`flex items-center gap-1.5 rounded-full ${meta.ring} px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm hover:brightness-110 transition`}
        >
          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
          <span className={meta.color}>{meta.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" align="start" className="w-56 text-xs z-[360]">
        <div className="space-y-2">
          <p className="font-semibold text-sm">Connection stats</p>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
            <span className="text-muted-foreground">Quality</span>
            <span className={meta.color}>{meta.label}</span>
            <span className="text-muted-foreground">Latency</span>
            <span>{stats.rttMs != null ? `${stats.rttMs} ms` : "—"}</span>
            <span className="text-muted-foreground">Packet loss</span>
            <span className={stats.lossPct != null && stats.lossPct > 3 ? "text-orange-400" : ""}>
              {stats.lossPct != null ? `${stats.lossPct}%` : "—"}
            </span>
            <span className="text-muted-foreground">Upload</span>
            <span>{stats.upKbps != null ? `${stats.upKbps} kbps` : "—"}</span>
            <span className="text-muted-foreground">Download</span>
            <span>{stats.downKbps != null ? `${stats.downKbps} kbps` : "—"}</span>
          </div>
          {quality === ConnectionQuality.Poor && localParticipant?.isCameraEnabled && (
            <button
              onClick={() => localParticipant?.setCameraEnabled(false).catch(() => {})}
              className="mt-1 inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300"
            >
              <VideoOff className="h-3.5 w-3.5" /> Turn off video to improve call
            </button>
          )}
          <p className="text-[10px] text-muted-foreground pt-1 border-t border-border">
            Updates every 3 seconds
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
