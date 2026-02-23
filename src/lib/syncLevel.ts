import { supabase } from "@/integrations/supabase/client";
import { getLevel } from "./levels";

/** Recompute and store the user's level on their profile. Returns { previousLevel, newLevel }. */
export async function syncUserLevel(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("computed_level")
    .eq("id", userId)
    .single();

  const previousLevel = (profile?.computed_level || "Beginner") as string;

  const { data: progress } = await supabase
    .from("user_skill_progress")
    .select("status")
    .eq("user_id", userId);

  if (!progress) return { previousLevel, newLevel: previousLevel };

  const total = progress.length;
  const completed = progress.filter((p) => p.status === "completed").length;
  const newLevel = getLevel(completed, total);

  await supabase
    .from("profiles")
    .update({ computed_level: newLevel })
    .eq("id", userId);

  return { previousLevel, newLevel };
}
