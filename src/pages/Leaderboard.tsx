import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLevelColor, type Level } from "@/lib/levels";
import { Trophy, Medal, Award, User, BarChart3 } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";

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
              <div className="space-y-3 py-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : !leaderboard || leaderboard.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No rankings yet"
                description="Complete skills to climb the leaderboard — every step counts!"
                actionLabel="Start Learning"
                onAction={() => window.location.href = "/roadmap"}
              />
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, i) => {
                  const isMe = entry.id === user?.id;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.06, ease: "easeOut" }}
                      whileHover={{ scale: 1.015 }}
                      className={`flex items-center gap-2 sm:gap-3 rounded-lg px-3 sm:px-4 py-3 transition-colors ${
                        isMe ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                      }`}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.06 + 0.15 }}
                        className="w-6 sm:w-8 text-center font-bold text-muted-foreground flex-shrink-0"
                      >
                        <RankIcon rank={i} />
                      </motion.div>
                      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
                        {entry.avatar_url ? (
                          <AvatarImage src={entry.avatar_url} alt={entry.display_name || "Student"} />
                        ) : null}
                        <AvatarFallback className="bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
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
                    </motion.div>
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
