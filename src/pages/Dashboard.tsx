import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { getLevel, getLevelColor } from "@/lib/levels";
import Layout from "@/components/Layout";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: progress } = useQuery({
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

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome back, {profile?.display_name || "Student"} 👋
          </h1>
          <p className="text-muted-foreground">Here's your skill progress overview</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallPct}%</div>
              <Progress value={overallPct} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-1">{totalCompleted}/{totalSkills} skills completed</p>
            </CardContent>
          </Card>

          <Card>
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

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tracks Following</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trackStats.length}</div>
              <p className="text-xs text-muted-foreground mt-1">skill tracks active</p>
            </CardContent>
          </Card>
        </div>

        {trackStats.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Track Progress</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trackStats.map((track, i) => {
                const pct = track.total > 0 ? Math.round((track.completed / track.total) * 100) : 0;
                const trackLevel = getLevel(track.completed, track.total);
                return (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{track.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{track.completed}/{track.total} done</span>
                        <Badge variant="outline" className={getLevelColor(trackLevel)}>{trackLevel}</Badge>
                      </div>
                      <Progress value={pct} />
                      {track.nextSkill && (
                        <p className="text-xs text-muted-foreground">Next: {track.nextSkill}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {trackStats.some((t) => t.nextSkill) && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Recommended Next Steps</h2>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {trackStats
                .filter((t) => t.nextSkill)
                .map((track, i) => (
                  <Card key={i} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/roadmap")}>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{track.name}</p>
                      <p className="font-medium">{track.nextSkill}</p>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}

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
