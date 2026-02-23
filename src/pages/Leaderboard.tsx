import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLevelColor, type Level } from "@/lib/levels";
import { Trophy, Medal, Award, User } from "lucide-react";

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 0) return <Trophy className="h-5 w-5 text-primary" />;
  if (rank === 1) return <Medal className="h-5 w-5 text-muted-foreground" />;
  if (rank === 2) return <Award className="h-5 w-5 text-accent-foreground" />;
  return <span className="text-sm">#{rank + 1}</span>;
};

const Leaderboard = () => {
  const { user } = useAuth();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      // Get all profiles
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, computed_level, college");
      if (pErr) throw pErr;

      // Get completed skill counts per user
      const { data: progress, error: prErr } = await supabase
        .from("user_skill_progress")
        .select("user_id, status");
      if (prErr) throw prErr;

      const countMap: Record<string, number> = {};
      progress?.forEach((p) => {
        if (p.status === "completed") {
          countMap[p.user_id] = (countMap[p.user_id] || 0) + 1;
        }
      });

      return (profiles || [])
        .map((p) => ({ ...p, completedSkills: countMap[p.id] || 0 }))
        .sort((a, b) => b.completedSkills - a.completedSkills)
        .slice(0, 50);
    },
    enabled: !!user,
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leaderboard 🏆</h1>
          <p className="text-muted-foreground">Top students ranked by skills completed</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading...</p>
            ) : !leaderboard || leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No data yet. Complete skills to appear here!</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => {
                  const isMe = entry.id === user?.id;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-2 sm:gap-3 rounded-lg px-3 sm:px-4 py-3 transition-colors ${
                        isMe ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="w-6 sm:w-8 text-center font-bold text-muted-foreground flex-shrink-0">
                        <RankIcon rank={i} />
                      </div>
                      <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-sm sm:text-base">
                            {entry.display_name || "Student"}
                            {isMe && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                          </p>
                          <Badge variant="outline" className={`text-[10px] sm:text-xs ${getLevelColor(entry.computed_level as Level)}`}>
                            {entry.computed_level}
                          </Badge>
                        </div>
                        {entry.college && (
                          <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{entry.college}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-sm sm:text-base">{entry.completedSkills}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">skills</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Leaderboard;
