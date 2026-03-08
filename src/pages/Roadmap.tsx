import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStreak } from "@/lib/streak";
import { checkAndAwardBadges } from "@/lib/badges";
import { syncUserLevel } from "@/lib/syncLevel";
import type { Level } from "@/lib/levels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import LevelUpToast from "@/components/LevelUpToast";
import useBadgePopup from "@/components/BadgePopup";
import { CheckCircle, Circle, Clock, Plus, Map } from "lucide-react";
import ErrorAlert, { getQueryErrorProps } from "@/components/ErrorAlert";
import EmptyState from "@/components/EmptyState";
import { motion, AnimatePresence } from "framer-motion";

const statusConfig = {
  not_started: { icon: Circle, label: "Not Started", color: "text-muted-foreground" },
  in_progress: { icon: Clock, label: "In Progress", color: "text-blue-500" },
  completed: { icon: CheckCircle, label: "Completed", color: "text-emerald-500" },
} as const;

const difficultyColors: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced: "bg-amber-100 text-amber-700",
};

const Roadmap = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newSkillName, setNewSkillName] = useState("");
  const [addingToTrack, setAddingToTrack] = useState<string | null>(null);
  const { triggerLevelUp, LevelUpAnimation } = LevelUpToast();
  const { showBadgePopup, BadgePopup } = useBadgePopup();

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["user_progress_full", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_skill_progress")
        .select("*, skills(*, skill_tracks(*))")
        .eq("user_id", user!.id)
        .order("skills(order)");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: customSkills } = useQuery({
    queryKey: ["custom_skills", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_custom_skills")
        .select("*, skill_tracks(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ progressId, status }: { progressId: string; status: string }) => {
      const { error } = await supabase
        .from("user_skill_progress")
        .update({
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", progressId);
      if (error) throw error;
    },
    onSuccess: async () => {
      if (user) {
        await updateStreak(user.id);
        const { previousLevel, newLevel } = await syncUserLevel(user.id);
        if (newLevel !== previousLevel) {
          triggerLevelUp(newLevel as Level);
        }
        const newBadges = await checkAndAwardBadges(user.id);
        if (newBadges.length > 0) {
          const { BADGES } = await import("@/lib/badges");
          newBadges.forEach((key, i) => {
            const badge = BADGES.find((b) => b.key === key);
            if (badge) {
              setTimeout(() => showBadgePopup(badge.name), i * 800);
            }
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["user_progress_full"] });
      queryClient.invalidateQueries({ queryKey: ["user_progress"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["user_badges"] });
    },
  });

  const addCustomSkill = useMutation({
    mutationFn: async ({ trackId, name }: { trackId: string; name: string }) => {
      const { error } = await supabase.from("user_custom_skills").insert({
        user_id: user!.id,
        track_id: trackId,
        name,
        status: "not_started",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom_skills"] });
      setNewSkillName("");
      setAddingToTrack(null);
      toast.success("Custom skill added!");
    },
  });

  const updateCustomStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("user_custom_skills").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["custom_skills"] }),
  });

  const tracks = progress?.reduce((acc: Record<string, { name: string; trackId: string; skills: any[] }>, p: any) => {
    const trackId = p.skills?.track_id;
    const trackName = p.skills?.skill_tracks?.name || "Unknown";
    if (!acc[trackId]) acc[trackId] = { name: trackName, trackId, skills: [] };
    acc[trackId].skills.push(p);
    return acc;
  }, {}) || {};

  const trackList: { name: string; trackId: string; skills: any[] }[] = Object.values(tracks);

  const cycleStatus = (current: string) => {
    if (current === "not_started") return "in_progress";
    if (current === "in_progress") return "completed";
    return "not_started";
  };

  if (progressLoading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-9 w-56 mb-2" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-10 w-64" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (trackList.length === 0) {
    return (
      <Layout>
        <EmptyState
          icon={Map}
          title="No skill tracks yet"
          description="Start by picking your stream and interests — we'll build your personalized roadmap."
          actionLabel="Get Started"
          onAction={() => window.location.href = "/onboarding"}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      {LevelUpAnimation}
      {BadgePopup}
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold">Skill Roadmap 🗺️</h1>
          <p className="text-muted-foreground">Track your learning journey</p>
        </motion.div>

        <Tabs defaultValue={trackList[0]?.trackId}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <TabsList className="flex-wrap h-auto">
              {trackList.map((track) => (
                <TabsTrigger key={track.trackId} value={track.trackId}>
                  {track.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>

          {trackList.map((track) => {
            const trackCustom = customSkills?.filter((cs: any) => cs.track_id === track.trackId) || [];
            
            // Group skills by category
            const sorted = track.skills.sort((a: any, b: any) => (a.skills?.order || 0) - (b.skills?.order || 0));
            const categories: Record<string, any[]> = {};
            sorted.forEach((p: any) => {
              const cat = p.skills?.category || "General";
              if (!categories[cat]) categories[cat] = [];
              categories[cat].push(p);
            });
            const categoryList = Object.entries(categories);

            let globalIndex = 0;

            return (
              <TabsContent key={track.trackId} value={track.trackId} className="space-y-5">
                {categoryList.map(([category, skills]) => (
                  <motion.div
                    key={category}
                    className="space-y-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">{category}</h3>
                    {skills.map((p: any) => {
                      const config = statusConfig[p.status as keyof typeof statusConfig];
                      const Icon = config.icon;
                      const idx = globalIndex++;
                      return (
                        <motion.div
                          key={p.id}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: idx * 0.04 }}
                        >
                          <Card className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <motion.button
                                  onClick={() => updateStatus.mutate({ progressId: p.id, status: cycleStatus(p.status) })}
                                  className={`${config.color}`}
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9, rotate: 15 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                >
                                  <Icon className="h-5 w-5" />
                                </motion.button>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    <span className="font-medium text-sm sm:text-base truncate">{p.skills?.name}</span>
                                    {p.skills?.difficulty_level && (
                                      <Badge variant="outline" className={difficultyColors[p.skills.difficulty_level] || ""}>
                                        {p.skills.difficulty_level}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{p.skills?.description}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className={config.color}>
                                {config.label}
                              </Badge>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                ))}

                {/* Custom skills */}
                {trackCustom.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Custom</h3>
                    {trackCustom.map((cs: any, i: number) => {
                      const config = statusConfig[cs.status as keyof typeof statusConfig];
                      const Icon = config.icon;
                      return (
                        <motion.div
                          key={cs.id}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: (globalIndex + i) * 0.04 }}
                        >
                          <Card className="border-dashed hover:shadow-sm transition-shadow">
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <motion.button
                                  onClick={() => updateCustomStatus.mutate({ id: cs.id, status: cycleStatus(cs.status) })}
                                  className={config.color}
                                  whileHover={{ scale: 1.2 }}
                                  whileTap={{ scale: 0.9, rotate: 15 }}
                                >
                                  <Icon className="h-5 w-5" />
                                </motion.button>
                                <span className="font-medium">{cs.name}</span>
                                <Badge variant="outline">Custom</Badge>
                              </div>
                              <Badge variant="outline" className={config.color}>
                                {config.label}
                              </Badge>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Add custom skill */}
                <AnimatePresence mode="wait">
                  {addingToTrack === track.trackId ? (
                    <motion.div
                      key="input"
                      className="flex gap-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Input
                        placeholder="Skill name..."
                        value={newSkillName}
                        onChange={(e) => setNewSkillName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newSkillName.trim()) {
                            addCustomSkill.mutate({ trackId: track.trackId, name: newSkillName.trim() });
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          if (newSkillName.trim()) addCustomSkill.mutate({ trackId: track.trackId, name: newSkillName.trim() });
                        }}
                      >
                        Add
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setAddingToTrack(null); setNewSkillName(""); }}>
                        Cancel
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div key="button" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                      <Button variant="outline" className="w-full" onClick={() => setAddingToTrack(track.trackId)}>
                        <Plus className="h-4 w-4 mr-2" /> Add Custom Skill
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Roadmap;
