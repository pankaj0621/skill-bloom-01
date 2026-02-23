import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { getLevel, getLevelColor } from "@/lib/levels";
import { User, Plus, X, BookOpen } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { motion, AnimatePresence } from "framer-motion";

const STREAM_LABELS: Record<string, string> = { btech: "BTech", ba: "BA", bcom: "BCom", bsc: "BSc", other: "Other" };
const GOAL_LABELS: Record<string, string> = { job: "Job", higher_studies: "Higher Studies", competitive_exams: "Competitive Exams", skill_career: "Skill-based Career" };

const Profile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [managingTracks, setManagingTracks] = useState(false);
  const [form, setForm] = useState({ display_name: "", bio: "", year: "", college: "", stream: "", primary_goal: "" });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      setForm({
        display_name: data.display_name || "",
        bio: data.bio || "",
        year: data.year?.toString() || "",
        college: data.college || "",
        stream: data.stream || "",
        primary_goal: data.primary_goal || "",
      });
      return data;
    },
    enabled: !!user,
  });

  const { data: progress } = useQuery({
    queryKey: ["user_progress", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_skill_progress")
        .select("*, skills(skill_tracks(id, name))")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // All available tracks for the user's stream
  const userStream = (profile as any)?.stream || "";
  const { data: availableTracks } = useQuery({
    queryKey: ["available_tracks", userStream],
    queryFn: async () => {
      const query = supabase.from("skill_tracks").select("*").eq("is_default", true);
      if (userStream) query.eq("stream", userStream);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!userStream,
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name,
          bio: form.bio,
          year: form.year ? parseInt(form.year) : null,
          college: form.college,
          stream: form.stream || null,
          primary_goal: form.primary_goal || null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["available_tracks"] });
      setEditing(false);
      toast.success("Profile updated! Recommendations will refresh.");
    },
  });

  // Add a track: insert progress rows for all its skills
  const addTrack = useMutation({
    mutationFn: async (trackId: string) => {
      const { data: skills, error: skillsError } = await supabase
        .from("skills")
        .select("id")
        .eq("track_id", trackId);
      if (skillsError) throw skillsError;
      if (skills && skills.length > 0) {
        const rows = skills.map((s) => ({ user_id: user!.id, skill_id: s.id, status: "not_started" as const }));
        const { error } = await supabase.from("user_skill_progress").upsert(rows, { onConflict: "user_id,skill_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_progress"] });
      queryClient.invalidateQueries({ queryKey: ["user_progress_full"] });
      toast.success("Track added!");
    },
  });

  // Remove a track: delete progress rows for its skills
  const removeTrack = useMutation({
    mutationFn: async (trackId: string) => {
      const { data: skills, error: skillsError } = await supabase
        .from("skills")
        .select("id")
        .eq("track_id", trackId);
      if (skillsError) throw skillsError;
      if (skills && skills.length > 0) {
        const skillIds = skills.map((s) => s.id);
        const { error } = await supabase
          .from("user_skill_progress")
          .delete()
          .eq("user_id", user!.id)
          .in("skill_id", skillIds);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_progress"] });
      queryClient.invalidateQueries({ queryKey: ["user_progress_full"] });
      toast.success("Track removed.");
    },
  });

  // Derive track stats and active track IDs
  const trackStats = progress
    ? Object.values(
        progress.reduce((acc: Record<string, { id: string; name: string; total: number; completed: number }>, p: any) => {
          const trackId = p.skills?.skill_tracks?.id || "unknown";
          const name = p.skills?.skill_tracks?.name || "Unknown";
          if (!acc[trackId]) acc[trackId] = { id: trackId, name, total: 0, completed: 0 };
          acc[trackId].total++;
          if (p.status === "completed") acc[trackId].completed++;
          return acc;
        }, {})
      )
    : [];

  const activeTrackIds = new Set(trackStats.map((t) => t.id));
  const inactiveTracks = availableTracks?.filter((t) => !activeTrackIds.has(t.id)) || [];

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <motion.h1
          className="text-3xl font-bold"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Profile
        </motion.h1>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <motion.div
                  className="h-16 w-16 rounded-full bg-muted flex items-center justify-center"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                >
                  <User className="h-8 w-8 text-muted-foreground" />
                </motion.div>
                <div>
                  <CardTitle>{profile?.display_name || "Student"}</CardTitle>
                  <p className="text-sm text-muted-foreground capitalize">{profile?.role || "No role set"}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {editing ? (
                  <motion.div
                    key="edit"
                    className="space-y-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Year</Label>
                        <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="e.g. 3" />
                      </div>
                      <div className="space-y-2">
                        <Label>College</Label>
                        <Input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="Your college" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Stream</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                          value={form.stream}
                          onChange={(e) => setForm({ ...form, stream: e.target.value })}
                        >
                          <option value="">Select stream</option>
                          <option value="btech">BTech</option>
                          <option value="ba">BA</option>
                          <option value="bcom">BCom</option>
                          <option value="bsc">BSc</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Primary Goal</Label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                          value={form.primary_goal}
                          onChange={(e) => setForm({ ...form, primary_goal: e.target.value })}
                        >
                          <option value="">Select goal</option>
                          <option value="job">Job</option>
                          <option value="higher_studies">Higher Studies</option>
                          <option value="competitive_exams">Competitive Exams</option>
                          <option value="skill_career">Skill-based Career</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">💡 Changing stream or goal will update your Dashboard recommendations.</p>
                    <div className="flex gap-2">
                      <Button onClick={() => updateProfile.mutate()}>Save</Button>
                      <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view"
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {profile?.bio && <p className="text-sm">{profile.bio}</p>}
                    {profile?.college && <p className="text-sm text-muted-foreground">🎓 {profile.college}</p>}
                    {profile?.year && <p className="text-sm text-muted-foreground">Year {profile.year}</p>}
                    {(profile as any)?.stream && (
                      <p className="text-sm text-muted-foreground">📚 {STREAM_LABELS[(profile as any).stream] || (profile as any).stream}</p>
                    )}
                    {(profile as any)?.primary_goal && (
                      <p className="text-sm text-muted-foreground">🎯 {GOAL_LABELS[(profile as any).primary_goal] || (profile as any).primary_goal}</p>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit Profile</Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Skill Tracks Management */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Skill Tracks</CardTitle>
              {!managingTracks && (
                <Button variant="outline" size="sm" onClick={() => setManagingTracks(true)}>
                  Manage Tracks
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence mode="wait">
                {managingTracks ? (
                  <motion.div
                    key="manage"
                    className="space-y-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Active tracks */}
                    {trackStats.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Tracks</Label>
                        {trackStats.map((track, i) => {
                          const lvl = getLevel(track.completed, track.total);
                          return (
                            <motion.div
                              key={track.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: i * 0.05 }}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{track.name}</span>
                                <Badge variant="outline" className={getLevelColor(lvl)}>{lvl}</Badge>
                                <span className="text-xs text-muted-foreground">{track.completed}/{track.total}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                onClick={() => {
                                  if (track.completed > 0) {
                                    toast.error(`Can't remove "${track.name}" — you have ${track.completed} completed skill(s). Reset progress first if needed.`);
                                  } else {
                                    removeTrack.mutate(track.id);
                                  }
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}

                    {/* Available tracks to add */}
                    {inactiveTracks.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Add Tracks</Label>
                        {inactiveTracks.map((track, i) => (
                          <motion.div
                            key={track.id}
                            className="flex items-center justify-between rounded-lg border border-dashed p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.05 }}
                            onClick={() => addTrack.mutate(track.id)}
                          >
                            <div>
                              <span className="font-medium">{track.name}</span>
                              {track.description && <p className="text-xs text-muted-foreground">{track.description}</p>}
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {!userStream && (
                      <p className="text-sm text-muted-foreground text-center py-2">Set your stream in the profile to see available tracks.</p>
                    )}

                    <p className="text-xs text-muted-foreground">💡 Adding or removing tracks will update your Roadmap and Dashboard recommendations.</p>
                    <Button variant="outline" size="sm" onClick={() => setManagingTracks(false)}>Done</Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view"
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {trackStats.length > 0 ? (
                      trackStats.map((track, i) => {
                        const lvl = getLevel(track.completed, track.total);
                        return (
                          <motion.div
                            key={track.id}
                            className="flex items-center justify-between"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.08 }}
                          >
                            <span className="font-medium">{track.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{track.completed}/{track.total}</span>
                              <Badge className={getLevelColor(lvl)}>{lvl}</Badge>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <EmptyState
                        icon={BookOpen}
                        title="No tracks selected"
                        description="Add skill tracks from your stream to start tracking progress."
                        actionLabel="Browse Tracks"
                        onAction={() => setManagingTracks(true)}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

export default Profile;
