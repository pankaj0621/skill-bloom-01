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

export async function checkAndAwardBadges(_userId: string) {
  // Badge awarding is performed server-side via a SECURITY DEFINER RPC.
  // This prevents users from inserting arbitrary badge_keys from the client.
  const { data, error } = await supabase.rpc("check_and_award_badges");
  if (error) {
    console.error("check_and_award_badges failed", error);
    return [] as string[];
  }
  return (data ?? []) as string[];
}
