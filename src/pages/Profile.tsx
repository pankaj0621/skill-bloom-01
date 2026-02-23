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
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { getLevel, getLevelColor } from "@/lib/levels";
import { User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Profile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ display_name: "", bio: "", year: "", college: "" });

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
        .select("*, skills(skill_tracks(name))")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
      toast.success("Profile updated!");
    },
  });

  const trackStats = progress
    ? Object.values(
        progress.reduce((acc: Record<string, { name: string; total: number; completed: number }>, p: any) => {
          const name = p.skills?.skill_tracks?.name || "Unknown";
          if (!acc[name]) acc[name] = { name, total: 0, completed: 0 };
          acc[name].total++;
          if (p.status === "completed") acc[name].completed++;
          return acc;
        }, {})
      )
    : [];

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
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit Profile</Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {trackStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Skills Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trackStats.map((track, i) => {
                  const level = getLevel(track.completed, track.total);
                  return (
                    <motion.div
                      key={i}
                      className="flex items-center justify-between"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 + i * 0.08 }}
                    >
                      <span className="font-medium">{track.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{track.completed}/{track.total}</span>
                        <Badge className={getLevelColor(level)}>{level}</Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
