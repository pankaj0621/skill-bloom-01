import { supabase } from "@/integrations/supabase/client";
import { Award, Flame, Trophy, Rocket } from "lucide-react";

export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  icon: typeof Award;
}

export const BADGES: BadgeDef[] = [
  { key: "first_skill", name: "First Skill Added", description: "Marked your first skill as in progress or completed", icon: Rocket },
  { key: "streak_7", name: "7 Day Streak", description: "Practiced for 7 consecutive days", icon: Flame },
  { key: "streak_30", name: "30 Day Streak", description: "Practiced for 30 consecutive days", icon: Trophy },
  { key: "first_track_complete", name: "First Track Completed", description: "Completed all skills in a track", icon: Award },
];

export async function checkAndAwardBadges(userId: string) {
  // Fetch current badges
  const { data: existing } = await supabase
    .from("user_badges")
    .select("badge_key")
    .eq("user_id", userId);

  const earned = new Set(existing?.map((b) => b.badge_key) || []);
  const toAward: string[] = [];

  // 1. First Skill Added — any skill not 'not_started'
  if (!earned.has("first_skill")) {
    const { count } = await supabase
      .from("user_skill_progress")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .neq("status", "not_started");
    if (count && count > 0) toAward.push("first_skill");
  }

  // 2 & 3. Streak badges
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_streak")
    .eq("id", userId)
    .single();

  const streak = profile?.current_streak ?? 0;
  if (!earned.has("streak_7") && streak >= 7) toAward.push("streak_7");
  if (!earned.has("streak_30") && streak >= 30) toAward.push("streak_30");

  // 4. First Track Completed — all skills in any track are 'completed'
  if (!earned.has("first_track_complete")) {
    const { data: progress } = await supabase
      .from("user_skill_progress")
      .select("skill_id, status, skills(track_id)")
      .eq("user_id", userId);

    if (progress) {
      const tracks: Record<string, { total: number; completed: number }> = {};
      for (const p of progress as { skills?: { track_id?: string } | null; status?: string }[]) {
        const tid = p.skills?.track_id;
        if (!tid) continue;
        if (!tracks[tid]) tracks[tid] = { total: 0, completed: 0 };
        tracks[tid].total++;
        if (p.status === "completed") tracks[tid].completed++;
      }
      if (Object.values(tracks).some((t) => t.total > 0 && t.completed === t.total)) {
        toAward.push("first_track_complete");
      }
    }
  }

  // Insert new badges
  if (toAward.length > 0) {
    await supabase.from("user_badges").insert(
      toAward.map((key) => ({ user_id: userId, badge_key: key }))
    );
  }

  return toAward;
}
