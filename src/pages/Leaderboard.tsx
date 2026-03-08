import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLevelColor, type Level } from "@/lib/levels";
import { Trophy, Medal, Award, User, BarChart3, Flame, Zap } from "lucide-react";
import ErrorAlert, { getQueryErrorProps } from "@/components/ErrorAlert";
import EmptyState from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";


const PODIUM_COLORS = [
  { ring: "ring-yellow-400", bg: "bg-yellow-400/10", text: "text-yellow-500", bar: "bg-gradient-to-t from-yellow-500/80 to-yellow-300/60" },
  { ring: "ring-slate-400", bg: "bg-slate-400/10", text: "text-slate-400", bar: "bg-gradient-to-t from-slate-400/80 to-slate-300/60" },
  { ring: "ring-amber-600", bg: "bg-amber-600/10", text: "text-amber-600", bar: "bg-gradient-to-t from-amber-700/80 to-amber-500/60" },
];

const PODIUM_ORDER = [1, 0, 2]; // silver, gold, bronze (display order)
const PODIUM_HEIGHTS = ["h-20", "h-28", "h-16"];

type TimeFilter = "all" | "monthly" | "weekly";

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "monthly", label: "This Month" },
  { value: "weekly", label: "This Week" },
];

const RankIcon = ({ rank }: { rank: number }) => {
  if (rank === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
  if (rank === 1) return <Medal className="h-5 w-5 text-slate-400" />;
  if (rank === 2) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="text-sm font-mono text-muted-foreground">#{rank + 1}</span>;
};

const StreakBadge = ({ streak }: { streak: number }) => {
  if (streak <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-semibold text-orange-500">
      <Flame className="h-3 w-3" />
      {streak}d
    </span>
  );
};

const getDateThreshold = (filter: TimeFilter): string | null => {
  if (filter === "all") return null;
  const now = new Date();
  if (filter === "monthly") {
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  }
  // weekly - start of current week (Monday)
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
};

const Leaderboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TimeFilter>("all");

  const { data: leaderboard, isLoading, error, refetch } = useQuery({
    queryKey: ["leaderboard", filter],
    queryFn: async () => {
      // Get all profiles with streak info
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, computed_level, college, current_streak, xp, weekly_xp");
      if (pErr) throw pErr;

      // Get completed skill counts per user (optionally filtered by date)
      const threshold = getDateThreshold(filter);
      let query = supabase
        .from("user_skill_progress")
        .select("user_id, status, completed_at")
        .eq("status", "completed");

      if (threshold) {
        query = query.gte("completed_at", threshold);
      }

      const { data: progress, error: prErr } = await query;
      if (prErr) throw prErr;

      const countMap: Record<string, number> = {};
      progress?.forEach((p) => {
        countMap[p.user_id] = (countMap[p.user_id] || 0) + 1;
      });

      return (profiles || [])
        .map((p: any) => ({ ...p, completedSkills: countMap[p.id] || 0 }))
        .filter((p: any) => filter === "all" || p.completedSkills > 0)
        .sort((a: any, b: any) => {
          // Primary: XP, Secondary: skills, Tertiary: streak
          const aXp = filter === "weekly" ? (a.weekly_xp || 0) : (a.xp || 0);
          const bXp = filter === "weekly" ? (b.weekly_xp || 0) : (b.xp || 0);
          if (bXp !== aXp) return bXp - aXp;
          if (b.completedSkills !== a.completedSkills) return b.completedSkills - a.completedSkills;
          return (b.current_streak || 0) - (a.current_streak || 0);
        })
        .slice(0, 50);
    },
    enabled: !!user,
  });

  // Find current user's rank
  const myRank = leaderboard?.findIndex((e) => e.id === user?.id) ?? -1;
  const confettiFired = useRef(false);

  useEffect(() => {
    if (myRank >= 0 && myRank < 3 && !confettiFired.current) {
      confettiFired.current = true;
      const duration = 2000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: ["#FFD700", "#C0C0C0", "#CD7F32"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: ["#FFD700", "#C0C0C0", "#CD7F32"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
    if (myRank < 0 || myRank >= 3) confettiFired.current = false;
  }, [myRank]);
  return (
    <Layout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold">Leaderboard 🏆</h1>
          <p className="text-muted-foreground">Top students ranked by XP</p>
        </motion.div>

        {/* Your rank card */}
        <AnimatePresence mode="wait">
          {myRank >= 0 && leaderboard && (
            <motion.div
              key={`rank-${filter}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                    <span className="text-lg font-bold text-primary">#{myRank + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">Your Rank</p>
                    <p className="text-xs text-muted-foreground">
                      <Zap className="inline h-3 w-3 text-amber-500 mr-0.5" />
                      {filter === "weekly" ? (leaderboard[myRank] as any).weekly_xp || 0 : (leaderboard[myRank] as any).xp || 0} XP
                      {' · '}{leaderboard[myRank].completedSkills} skills
                      {leaderboard[myRank].current_streak > 0 && (
                        <> · <Flame className="inline h-3 w-3 text-orange-500" /> {leaderboard[myRank].current_streak}d</>
                      )}
                    </p>
                  </div>
                  <Badge variant="outline" className={getLevelColor(leaderboard[myRank].computed_level as Level)}>
                    {leaderboard[myRank].computed_level}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter tabs */}
        <motion.div
          className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {TIME_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "relative px-4 py-2 text-sm font-medium rounded-md transition-colors",
                filter === f.value
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter === f.value && (
                <motion.div
                  layoutId="filter-pill"
                  className="absolute inset-0 bg-primary rounded-md"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Podium Top 3 */}
        <AnimatePresence mode="wait">
          {!isLoading && leaderboard && leaderboard.length >= 3 && (
            <motion.div
              key={`podium-${filter}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex items-end justify-center gap-3 sm:gap-6 py-4"
            >
              {PODIUM_ORDER.map((rank, displayIdx) => {
                const entry = leaderboard[rank];
                if (!entry) return null;
                const color = PODIUM_COLORS[rank];
                const isMe = entry.id === user?.id;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: displayIdx * 0.12 + 0.2, type: "spring", stiffness: 260, damping: 22 }}
                    className="flex flex-col items-center cursor-pointer group"
                    onClick={() => navigate(`/user/${entry.id}`)}
                  >
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      className="relative mb-2"
                    >
                      <Avatar className={cn(
                        "ring-[3px] transition-shadow group-hover:shadow-lg",
                        color.ring,
                        rank === 0 ? "h-16 w-16 sm:h-20 sm:w-20" : "h-12 w-12 sm:h-16 sm:w-16"
                      )}>
                        {entry.avatar_url ? (
                          <AvatarImage src={entry.avatar_url} alt={entry.display_name || "Student"} />
                        ) : null}
                        <AvatarFallback className="bg-muted">
                          <User className={rank === 0 ? "h-6 w-6" : "h-4 w-4"} />
                        </AvatarFallback>
                      </Avatar>
                      {rank === 0 && (
                        <motion.span
                          className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl"
                          initial={{ scale: 0, rotate: -20 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                        >
                          👑
                        </motion.span>
                      )}
                    </motion.div>
                    <p className={cn(
                      "font-semibold text-xs sm:text-sm text-center truncate max-w-[80px] sm:max-w-[100px]",
                      isMe && "text-primary"
                    )}>
                      {entry.display_name || "Student"}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Zap className="h-3 w-3 text-amber-500" />
                      <span className={cn("text-xs font-bold", color.text)}>
                        {filter === "weekly" ? (entry as any).weekly_xp || 0 : (entry as any).xp || 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground">XP</span>
                    </div>
                    {(entry.current_streak || 0) > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-500 mt-0.5">
                        <Flame className="h-2.5 w-2.5" />{entry.current_streak}d
                      </span>
                    )}
                    {/* Podium bar */}
                    <div className={cn(
                      "w-16 sm:w-20 rounded-t-lg mt-2",
                      PODIUM_HEIGHTS[displayIdx],
                      color.bar
                    )}>
                      <div className="flex items-center justify-center pt-2">
                        <span className={cn("font-bold text-sm sm:text-lg", color.text)}>
                          {rank === 0 ? "🥇" : rank === 1 ? "🥈" : "🥉"}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filter === "all" ? "All Time Rankings" : filter === "monthly" ? "This Month" : "This Week"}
            </CardTitle>
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
                title={filter !== "all" ? "No activity this period" : "No rankings yet"}
                description={
                  filter !== "all"
                    ? "Nobody has completed skills in this time period yet. Be the first!"
                    : "Complete skills to climb the leaderboard — every step counts!"
                }
                actionLabel="Start Learning"
                onAction={() => navigate("/roadmap")}
              />
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={filter}
                  className="space-y-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {leaderboard.map((entry, i) => {
                    const isMe = entry.id === user?.id;
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.04, ease: "easeOut" }}
                        whileHover={{ scale: 1.015 }}
                        className={cn(
                          "flex items-center gap-2 sm:gap-3 rounded-lg px-3 sm:px-4 py-3 transition-colors cursor-pointer",
                          isMe ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/50"
                        )}
                        onClick={() => navigate(`/user/${entry.id}`)}
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20, delay: i * 0.04 + 0.1 }}
                          className="w-6 sm:w-8 text-center flex-shrink-0"
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
                            <Badge variant="outline" className={cn("text-[10px] sm:text-xs", getLevelColor(entry.computed_level as Level))}>
                              {entry.computed_level}
                            </Badge>
                            <StreakBadge streak={entry.current_streak || 0} />
                          </div>
                          {entry.college && (
                            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{entry.college}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="flex items-center gap-1 justify-end">
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                            <p className="font-semibold text-sm sm:text-base">
                              {filter === "weekly" ? (entry as any).weekly_xp || 0 : (entry as any).xp || 0}
                            </p>
                          </div>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">{entry.completedSkills} skills</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Leaderboard;
