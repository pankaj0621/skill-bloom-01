import { supabase } from "@/integrations/supabase/client";
import { getLevel } from "./levels";

/** Recompute and store the user's level on their profile */
export async function syncUserLevel(userId: string) {
  const { data: progress } = await supabase
    .from("user_skill_progress")
    .select("status")
    .eq("user_id", userId);

  if (!progress) return;

  const total = progress.length;
  const completed = progress.filter((p) => p.status === "completed").length;
  const level = getLevel(completed, total);

  await supabase
    .from("profiles")
    .update({ computed_level: level })
    .eq("id", userId);
}
