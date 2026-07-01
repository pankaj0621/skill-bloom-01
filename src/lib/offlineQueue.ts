/**
 * Lightweight offline mutation queue.
 *
 * When the browser is offline, feature code calls `enqueue(op)` instead of
 * throwing. Ops are persisted to localStorage; when the `online` event fires
 * (or on next app boot), `flushQueue()` replays them against Supabase and
 * shows a summary toast.
 *
 * Only user-driven, idempotent-ish mutations should live here (last-write-wins
 * on status/read flags is fine). Do NOT queue AI calls, inserts that need
 * server-generated deps, or anything that depends on fresh reads.
 */
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type QueuedOp =
  | { id: string; type: "skill_status"; progressId: string; status: string; completedAt: string | null }
  | { id: string; type: "custom_skill_status"; skillId: string; status: string }
  | { id: string; type: "notification_read"; notificationId: string }
  | { id: string; type: "notification_delete"; notificationId: string };

const KEY = "spct-offline-queue";
let flushing = false;
let listeners: Array<() => void> = [];

function load(): QueuedOp[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as QueuedOp[];
  } catch {
    return [];
  }
}

function save(queue: QueuedOp[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {
    /* storage full — silently drop */
  }
  listeners.forEach((cb) => cb());
}

export function getQueueSize(): number {
  return load().length;
}

export function subscribeQueue(cb: () => void): () => void {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((c) => c !== cb);
  };
}

// Distributive omit so each union arm keeps its own required fields.
type DistributiveOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

export function enqueue(op: DistributiveOmit<QueuedOp, "id">) {
  const queue = load();
  const withId = { ...op, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` } as QueuedOp;
  queue.push(withId);
  save(queue);
}

async function runOp(op: QueuedOp): Promise<void> {
  if (op.type === "skill_status") {
    const { error } = await supabase
      .from("user_skill_progress")
      .update({ status: op.status, completed_at: op.completedAt })
      .eq("id", op.progressId);
    if (error) throw error;
  } else if (op.type === "custom_skill_status") {
    const { error } = await supabase
      .from("user_custom_skills")
      .update({ status: op.status })
      .eq("id", op.skillId);
    if (error) throw error;
  } else if (op.type === "notification_read") {
    const { error } = await supabase
      .from("notifications")
      .update({ read: true } as { read: boolean })
      .eq("id", op.notificationId);
    if (error) throw error;
  } else if (op.type === "notification_delete") {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", op.notificationId);
    if (error) throw error;
  }
}

export async function flushQueue(): Promise<{ ok: number; failed: number }> {
  if (flushing || typeof navigator === "undefined" || !navigator.onLine) {
    return { ok: 0, failed: 0 };
  }
  flushing = true;
  let ok = 0;
  let failed = 0;
  try {
    const queue = load();
    if (queue.length === 0) return { ok: 0, failed: 0 };
    const remaining: QueuedOp[] = [];
    for (const op of queue) {
      try {
        await runOp(op);
        ok++;
      } catch {
        remaining.push(op);
        failed++;
      }
    }
    save(remaining);
    return { ok, failed };
  } finally {
    flushing = false;
  }
}

let inited = false;
export function initOfflineQueue() {
  if (inited || typeof window === "undefined") return;
  inited = true;

  const attempt = async () => {
    if (!navigator.onLine) return;
    const size = getQueueSize();
    if (size === 0) return;
    const { ok, failed } = await flushQueue();
    if (ok > 0) {
      toast.success(`Synced ${ok} offline change${ok > 1 ? "s" : ""}`);
    }
    if (failed > 0) {
      toast.error(`${failed} offline change${failed > 1 ? "s" : ""} couldn't sync`, {
        description: "We'll retry automatically next time.",
      });
    }
  };

  window.addEventListener("online", attempt);
  // Also re-attempt when the tab is foregrounded — mobile browsers freeze
  // background tabs, so an offline→online transition can happen while we
  // aren't listening. Coming back visible is our chance to catch up.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") attempt();
  });
  window.addEventListener("focus", attempt);
  // On boot: if we already have pending ops and we're online, drain them.
  if (navigator.onLine) {
    setTimeout(attempt, 1500);
  }
}
