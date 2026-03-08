import { useAuth } from "@/contexts/AuthContext";
import AnimatedCounter from "@/components/AnimatedCounter";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AnimatedProgress from "@/components/AnimatedProgress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getLevel, getLevelColor } from "@/lib/levels";
import Layout from "@/components/Layout";
import { AlertTriangle, Lightbulb, ArrowRight, BookOpen, Users, Info, Flame } from "lucide-react";
import ErrorAlert, { getQueryErrorProps } from "@/components/ErrorAlert";
import ActivityFeed from "@/components/ActivityFeed";
import XpCard from "@/components/XpCard";
import XpMilestoneToast, { getXpMilestone } from "@/components/XpMilestoneToast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BADGES } from "@/lib/badges";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as const } },
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["user_progress", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_skill_progress")
        .select("*, skills(*, skill_tracks(*))")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: earnedBadges, isLoading: badgesLoading } = useQuery({
    queryKey: ["user_badges", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("badge_key, earned_at")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const trackStats = progress
    ? Object.values(
        progress.reduce((acc: Record<string, { name: string; total: number; completed: number; nextSkill?: string }>, p: any) => {
          const trackName = p.skills?.skill_tracks?.name || "Unknown";
          const trackId = p.skills?.track_id || "unknown";
          if (!acc[trackId]) acc[trackId] = { name: trackName, total: 0, completed: 0 };
          acc[trackId].total++;
          if (p.status === "completed") acc[trackId].completed++;
          else if (!acc[trackId].nextSkill) acc[trackId].nextSkill = p.skills?.name;
          return acc;
        }, {})
      )
    : [];

  const totalSkills = trackStats.reduce((s, t) => s + t.total, 0);
  const totalCompleted = trackStats.reduce((s, t) => s + t.completed, 0);
  const overallPct = totalSkills > 0 ? Math.round((totalCompleted / totalSkills) * 100) : 0;
  const level = getLevel(totalCompleted, totalSkills);

  const isLoading = profileLoading || progressLoading || badgesLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-9 w-72 mb-2" />
            <Skeleton className="h-5 w-56" />
          </div>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader>
                <CardContent><Skeleton className="h-7 w-16 mb-2" /><Skeleton className="h-4 w-full" /></CardContent>
              </Card>
            ))}
          </div>
          <div>
            <Skeleton className="h-6 w-32 mb-3" />
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-28 rounded-lg" />
              ))}
            </div>
          </div>
          <div>
            <Skeleton className="h-6 w-40 mb-3" />
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2"><Skeleton className="h-5 w-32" /></CardHeader>
                  <CardContent className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Welcome back, {profile?.display_name || "Student"} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Here's your skill progress overview</p>
        </div>

        <motion.div
          className="grid gap-3 grid-cols-2 md:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} transition={{ type: "tween", duration: 0.2 }}>
            <Card className="transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallPct}%</div>
                <AnimatedProgress value={overallPct} className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">{totalCompleted}/{totalSkills} skills completed</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} transition={{ type: "tween", duration: 0.2 }}>
            <Card className="transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current Level</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={getLevelColor(level)}>{level}</Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  {level === "Beginner" && "Keep going! Complete more skills to level up."}
                  {level === "Intermediate" && "Great progress! You're halfway there."}
                  {level === "Advanced" && "Outstanding! You're a skill master."}
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} transition={{ type: "tween", duration: 0.2 }}>
            <Card className="transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Daily Streak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <motion.div
                    key={profile?.current_streak}
                    initial={{ scale: 1.3, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  >
                    <Flame className={`h-6 w-6 ${(profile?.current_streak ?? 0) > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
                  </motion.div>
                  <AnimatedCounter value={profile?.current_streak ?? 0} className="text-2xl font-bold" />
                  <span className="text-sm text-muted-foreground">days</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Best: {profile?.longest_streak ?? 0} days
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} transition={{ type: "tween", duration: 0.2 }}>
            <Card className="transition-shadow duration-200 hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Tracks Following</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{trackStats.length}</div>
                <p className="text-xs text-muted-foreground mt-1">skill tracks active</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* XP Card */}
        <motion.div variants={itemVariants} initial="hidden" animate="show">
          <XpCard xp={(profile as any)?.xp ?? 0} weeklyXp={(profile as any)?.weekly_xp ?? 0} />
        </motion.div>
        <XpMilestoneToast xp={(profile as any)?.xp ?? 0} milestone={getXpMilestone((profile as any)?.xp ?? 0)} />

        {/* Badges */}
        {(() => {
          const earnedKeys = new Set(earnedBadges?.map((b) => b.badge_key) || []);

          return (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Badges</h2>
              <motion.div
                className="flex flex-wrap gap-3"
                variants={containerVariants}
                initial="hidden"
                animate="show"
              >
                {BADGES.map((badge) => {
                  const isEarned = earnedKeys.has(badge.key);
                  const Icon = badge.icon;
                  return (
                    <motion.div key={badge.key} variants={itemVariants}>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all w-28 ${
                            isEarned
                              ? "bg-primary/10 border-primary/30 shadow-sm"
                              : "bg-muted/30 border-border opacity-40 grayscale"
                          }`}>
                            <Icon className={`h-7 w-7 ${isEarned ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="text-xs font-medium text-center leading-tight">{badge.name}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-medium">{badge.name}</p>
                          <p className="text-xs text-muted-foreground">{badge.description}</p>
                          {isEarned && earnedBadges && (
                            <p className="text-xs mt-1">Earned {new Date(earnedBadges.find((b) => b.badge_key === badge.key)!.earned_at).toLocaleDateString()}</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          );
        })()}

        {trackStats.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Track Progress</h2>
            <motion.div
              className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {trackStats.map((track, i) => {
                const pct = track.total > 0 ? Math.round((track.completed / track.total) * 100) : 0;
                const trackLevel = getLevel(track.completed, track.total);
                return (
                  <motion.div key={i} variants={itemVariants} whileHover={{ scale: 1.02, y: -2 }} transition={{ type: "tween", duration: 0.2 }}>
                    <Card className="transition-shadow duration-200 hover:shadow-md">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{track.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{track.completed}/{track.total} done</span>
                        <Badge variant="outline" className={getLevelColor(trackLevel)}>{trackLevel}</Badge>
                      </div>
                      <AnimatedProgress value={pct} />
                      {track.nextSkill && (
                        <p className="text-xs text-muted-foreground">Next: {track.nextSkill}</p>
                      )}
                    </CardContent>
                  </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}

        {/* Friend Activity Feed */}
        <motion.div variants={itemVariants} initial="hidden" animate="show">
          <ActivityFeed />
        </motion.div>

        {/* Priority Skills & Smart Recommendations */}
        {progress && progress.length > 0 && (() => {
          const userStream = (profile as any)?.stream || "";
          const userGoal = (profile as any)?.primary_goal || "";
          const streamLabel = ({ btech: "BTech", ba: "BA", bcom: "BCom", bsc: "BSc", other: "General" } as Record<string, string>)[userStream] || "your stream";
          const goalLabel = ({ job: "Job Preparation", higher_studies: "Higher Studies", competitive_exams: "Competitive Exams", skill_career: "Skill-based Career" } as Record<string, string>)[userGoal] || "your goal";

          const goalSkillBoost: Record<string, string[]> = {
            job: ["interview", "resume", "api", "rest", "deploy", "test", "react", "javascript", "node", "express", "database", "sql", "excel", "digital marketing", "communication", "python", "accounting", "finance"],
            higher_studies: ["research", "thesis", "writing", "literature", "calculus", "linear algebra", "probability", "statistics", "methodology", "publication", "scientific"],
            competitive_exams: ["current affairs", "reasoning", "aptitude", "fundamentals", "basics", "writing", "problem solving", "time management", "calculus", "statistics", "critical thinking"],
            skill_career: ["project", "portfolio", "practical", "tool", "design", "build", "create", "automation", "ai", "machine learning", "entrepreneurship", "freelance"],
          };
          const boostKeywords = goalSkillBoost[userGoal] || [];
          const getGoalBoost = (name: string) => boostKeywords.some((kw) => name.toLowerCase().includes(kw)) ? 25 : 0;

          const trackMap = progress.reduce((acc: Record<string, { name: string; total: number; completed: number; incompleteSkills: { name: string; status: string; difficulty: string; order: number }[] }>, p: any) => {
            const trackId = p.skills?.track_id || "unknown";
            const trackName = p.skills?.skill_tracks?.name || "Unknown";
            if (!acc[trackId]) acc[trackId] = { name: trackName, total: 0, completed: 0, incompleteSkills: [] };
            acc[trackId].total++;
            if (p.status === "completed") acc[trackId].completed++;
            else acc[trackId].incompleteSkills.push({
              name: p.skills?.name || "",
              status: p.status,
              difficulty: p.skills?.difficulty_level || "beginner",
              order: p.skills?.order || 0,
            });
            return acc;
          }, {});

          // Score all incomplete skills with stream + goal context
          const allScored = Object.values(trackMap).flatMap((track) => {
            const trackPct = track.total > 0 ? track.completed / track.total : 0;
            return track.incompleteSkills.map((skill) => {
              const goalBoost = getGoalBoost(skill.name);
              const score =
                (1 - trackPct) * 50 +
                (skill.status === "not_started" ? 15 : 0) +
                (100 - skill.order) +
                goalBoost +
                (level === "Beginner" && skill.difficulty === "beginner" ? 20 : 0) +
                (level === "Intermediate" && skill.difficulty === "intermediate" ? 20 : 0) +
                (level === "Advanced" && skill.difficulty === "advanced" ? 20 : 0);

              let reason = "";
              if (goalBoost > 0 && trackPct < 0.3) {
                reason = `Important for ${goalLabel} and your ${track.name} track needs attention (${Math.round(trackPct * 100)}% done)`;
              } else if (goalBoost > 0) {
                reason = `Directly relevant to your ${goalLabel} goal — focus here to stay on track`;
              } else if (trackPct < 0.2) {
                reason = `Your ${track.name} track is only at ${Math.round(trackPct * 100)}% — this is your weakest area`;
              } else if (skill.status === "not_started") {
                reason = `You haven't started this yet — it'll help round out your ${track.name} skills`;
              } else {
                reason = `Already in progress in ${track.name} — finishing this will boost your level`;
              }

              return { ...skill, trackName: track.name, trackPct, score, reason, goalRelevant: goalBoost > 0 };
            });
          }).sort((a, b) => b.score - a.score);

          if (allScored.length === 0) return null;

          const prioritySkills = allScored.slice(0, 2);
          const mainStep = allScored[0];
          const optionalActions = allScored.slice(1, 3);
          const weakestTrack = Object.values(trackMap).sort((a, b) => (a.completed / a.total) - (b.completed / b.total))[0];
          const weakestPct = weakestTrack ? Math.round((weakestTrack.completed / weakestTrack.total) * 100) : 0;

          const goalContext = userGoal && userStream ? `As a ${streamLabel} student aiming for ${goalLabel}, ` : "";
          const whyExplanation = level === "Beginner"
            ? `${goalContext}you're just getting started (${overallPct}% done). We're picking foundational skills from your weakest track — ${weakestTrack?.name} (${weakestPct}%) — so you build a strong base first.`
            : level === "Intermediate"
            ? `${goalContext}you're making solid progress (${overallPct}% done). We're focusing on skills in ${weakestTrack?.name} (${weakestPct}%) that match your current level and are most relevant to your goals.`
            : `${goalContext}you're nearly there (${overallPct}% done)! We're highlighting the remaining advanced skills in ${weakestTrack?.name} (${weakestPct}%) to help you reach mastery.`;

          const summaryLine = mainStep.goalRelevant
            ? `"${mainStep.name}" is key for ${goalLabel} — and it's in your weakest area right now.`
            : `"${mainStep.name}" is in ${mainStep.trackName}, your weakest track — finishing it will level you up.`;

          return (
            <>
              {/* Priority Skills */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Priority Skills
                </h2>
                {userStream && userGoal && (
                  <p className="text-sm text-muted-foreground -mt-2">
                    Based on your <span className="font-medium text-foreground">{streamLabel}</span> stream + <span className="font-medium text-foreground">{goalLabel}</span> goal
                  </p>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  {prioritySkills.map((skill, i) => (
                    <Card key={i} className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/roadmap")}>
                      <CardContent className="p-4 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-amber-600 bg-amber-100 dark:bg-amber-900/40">Priority #{i + 1}</Badge>
                            {skill.goalRelevant && <Badge variant="outline" className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30">🎯 Goal</Badge>}
                          </div>
                          <Badge variant="outline" className="capitalize">{skill.difficulty}</Badge>
                        </div>
                        <p className="font-semibold">{skill.name}</p>
                        <p className="text-sm text-muted-foreground">{skill.trackName}</p>
                        <p className="text-xs text-amber-700 dark:text-amber-400">{skill.reason}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Smart Recommendations */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Smart Recommendations
                </h2>
                <p className="text-sm text-muted-foreground -mt-2">{summaryLine}</p>

                <motion.div
                  initial={{ boxShadow: "0 0 0 0 hsl(var(--primary) / 0)" }}
                  animate={{ boxShadow: ["0 0 0 0 hsl(var(--primary) / 0)", "0 0 20px 4px hsl(var(--primary) / 0.25)", "0 0 0 0 hsl(var(--primary) / 0)"] }}
                  transition={{ duration: 1.5, delay: 0.6, ease: "easeInOut" }}
                  className="rounded-lg"
                >
                <Card className="border-primary/30 bg-primary/5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/roadmap")}>
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-primary/10 p-2.5 mt-0.5">
                        <ArrowRight className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary text-primary-foreground">Main Next Step</Badge>
                          <Badge variant="outline" className="capitalize">{mainStep.difficulty}</Badge>
                          {mainStep.goalRelevant && <Badge variant="outline" className="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40">🎯 Goal-relevant</Badge>}
                        </div>
                        <p className="text-lg font-semibold">{mainStep.name}</p>
                        <p className="text-sm text-muted-foreground">{mainStep.trackName} · {mainStep.status === "not_started" ? "Not started yet" : "Already in progress"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>

                {optionalActions.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {optionalActions.map((action, i) => {
                      const ActionIcon = i === 0 ? BookOpen : Users;
                      return (
                        <Card key={i} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate("/roadmap")}>
                          <CardContent className="p-4 flex items-start gap-3">
                            <div className="rounded-full bg-muted p-2 mt-0.5">
                              <ActionIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="text-xs">Also consider</Badge>
                                {action.goalRelevant && <Badge variant="outline" className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30">🎯 Goal</Badge>}
                              </div>
                              <p className="font-medium">{action.name}</p>
                              <p className="text-xs text-muted-foreground">{action.trackName} · {action.difficulty}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}

                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
                    <Info className="h-4 w-4" />
                    <span>Why this recommendation?</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <Card className="bg-muted/50">
                      <CardContent className="p-4 text-sm text-muted-foreground">
                        {whyExplanation}
                      </CardContent>
                    </Card>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </>
          );
        })()}

        {trackStats.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">You haven't selected any skill tracks yet.</p>
              <Button onClick={() => navigate("/onboarding")}>Get Started</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
