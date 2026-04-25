import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFriendsList } from "@/hooks/useFriendship";

export interface FeedItem {
  id: string;
  type: "badge" | "level_up" | "skill_completed" | "streak";
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  title: string;
  detail: string | null;
  timestamp: string;
}

export function useActivityFeed(userId: string | undefined) {
  const { data: friends } = useFriendsList(userId);
  const friendIds = friends?.map((f: { id: string }) => f.id) || [];

  return useQuery<FeedItem[]>({
    queryKey: ["activity_feed", userId, friendIds.join(",")],
    queryFn: async () => {
      if (friendIds.length === 0) return [];

      // Fetch recent badges earned by friends
      const { data: badges } = await supabase
        .from("user_badges")
        .select("id, badge_key, earned_at, user_id")
        .in("user_id", friendIds)
        .order("earned_at", { ascending: false })
        .limit(15);

      // Fetch friends' profiles for names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, computed_level, current_streak")
        .in("id", friendIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      // Fetch recent skill completions by friends
      const { data: completions } = await supabase
        .from("user_skill_progress")
        .select("id, user_id, status, completed_at, skills(name)")
        .in("user_id", friendIds)
        .eq("status", "completed")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(15);

      const items: FeedItem[] = [];

      // Badge events
      (badges || []).forEach((b) => {
        const p = profileMap.get(b.user_id);
        items.push({
          id: `badge-${b.id}`,
          type: "badge",
          userId: b.user_id,
          displayName: p?.display_name || "Student",
          avatarUrl: p?.avatar_url || null,
          title: `Earned the "${b.badge_key}" badge`,
          detail: null,
          timestamp: b.earned_at,
        });
      });

      // Skill completion events
      (completions || []).forEach((c: { id: string; user_id: string; completed_at: string; skills?: { name: string } | null }) => {
        const p = profileMap.get(c.user_id);
        items.push({
          id: `skill-${c.id}`,
          type: "skill_completed",
          userId: c.user_id,
          displayName: p?.display_name || "Student",
          avatarUrl: p?.avatar_url || null,
          title: `Completed "${c.skills?.name || "a skill"}"`,
          detail: null,
          timestamp: c.completed_at,
        });
      });

      // Streak highlights (friends with active streaks)
      (profiles || []).forEach((p) => {
        if (p.current_streak >= 3) {
          items.push({
            id: `streak-${p.id}`,
            type: "streak",
            userId: p.id,
            displayName: p.display_name || "Student",
            avatarUrl: p.avatar_url,
            title: `On a ${p.current_streak}-day streak 🔥`,
            detail: null,
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Sort by timestamp desc and limit
      return items
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 20);
    },
    enabled: !!userId && friendIds.length > 0,
  });
}
