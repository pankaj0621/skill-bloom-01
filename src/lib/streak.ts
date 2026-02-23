import { supabase } from "@/integrations/supabase/client";

/**
 * Updates the user's daily streak.
 * - Same day activity: no change
 * - Consecutive day: increment streak
 * - Missed a day: reset to 1
 */
export async function updateStreak(userId: string) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("current_streak, longest_streak, last_activity_date")
    .eq("id", userId)
    .single();

  if (error || !profile) return;

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const lastDate = profile.last_activity_date;

  if (lastDate === today) return; // Already logged today

  let newStreak = 1;

  if (lastDate) {
    const last = new Date(lastDate);
    const now = new Date(today);
    const diffMs = now.getTime() - last.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak = (profile.current_streak || 0) + 1;
    }
    // diffDays > 1 means missed a day → reset to 1
  }

  const newLongest = Math.max(newStreak, profile.longest_streak || 0);

  await supabase
    .from("profiles")
    .update({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
    })
    .eq("id", userId);
}
