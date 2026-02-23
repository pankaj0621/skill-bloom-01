import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { CheckCircle, Circle, Clock, Plus } from "lucide-react";

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

  const { data: progress } = useQuery({
    queryKey: ["user_progress_full", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_skill_progress")
        .select("*, skills(*, skill_tracks(*))")
        .eq("user_id", user!.id)
        .order("skills(order)");
      if (error) throw error;
      return data;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_progress_full"] });
      queryClient.invalidateQueries({ queryKey: ["user_progress"] });
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

  // Group by track
  const tracks = progress?.reduce((acc: Record<string, { name: string; trackId: string; skills: any[] }>, p: any) => {
    const trackId = p.skills?.track_id;
    const trackName = p.skills?.skill_tracks?.name || "Unknown";
    if (!acc[trackId]) acc[trackId] = { name: trackName, trackId, skills: [] };
    acc[trackId].skills.push(p);
    return acc;
  }, {}) || {};

  const trackList = Object.values(tracks);

  const cycleStatus = (current: string) => {
    if (current === "not_started") return "in_progress";
    if (current === "in_progress") return "completed";
    return "not_started";
  };

  if (trackList.length === 0) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No skill tracks found. Complete onboarding first.</p>
          <Button onClick={() => window.location.href = "/onboarding"}>Go to Onboarding</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Skill Roadmap 🗺️</h1>
          <p className="text-muted-foreground">Track your learning journey</p>
        </div>

        <Tabs defaultValue={trackList[0]?.trackId}>
          <TabsList className="flex-wrap h-auto">
            {trackList.map((track) => (
              <TabsTrigger key={track.trackId} value={track.trackId}>
                {track.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {trackList.map((track) => {
            const trackCustom = customSkills?.filter((cs: any) => cs.track_id === track.trackId) || [];
            return (
              <TabsContent key={track.trackId} value={track.trackId} className="space-y-3">
                {track.skills
                  .sort((a: any, b: any) => (a.skills?.order || 0) - (b.skills?.order || 0))
                  .map((p: any) => {
                    const config = statusConfig[p.status as keyof typeof statusConfig];
                    const Icon = config.icon;
                    return (
                      <Card key={p.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              onClick={() => updateStatus.mutate({ progressId: p.id, status: cycleStatus(p.status) })}
                              className={`${config.color} hover:scale-110 transition-transform`}
                            >
                              <Icon className="h-5 w-5" />
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{p.skills?.name}</span>
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
                    );
                  })}

                {/* Custom skills */}
                {trackCustom.map((cs: any) => {
                  const config = statusConfig[cs.status as keyof typeof statusConfig];
                  const Icon = config.icon;
                  return (
                    <Card key={cs.id} className="border-dashed hover:shadow-sm transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => updateCustomStatus.mutate({ id: cs.id, status: cycleStatus(cs.status) })}
                            className={`${config.color} hover:scale-110 transition-transform`}
                          >
                            <Icon className="h-5 w-5" />
                          </button>
                          <span className="font-medium">{cs.name}</span>
                          <Badge variant="outline">Custom</Badge>
                        </div>
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Add custom skill */}
                {addingToTrack === track.trackId ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Skill name..."
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newSkillName.trim()) {
                          addCustomSkill.mutate({ trackId: track.trackId, name: newSkillName.trim() });
                        }
                      }}
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
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => setAddingToTrack(track.trackId)}>
                    <Plus className="h-4 w-4 mr-2" /> Add Custom Skill
                  </Button>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </Layout>
  );
};

export default Roadmap;
