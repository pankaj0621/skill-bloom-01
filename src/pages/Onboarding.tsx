import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<string>("junior");
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: tracks } = useQuery({
    queryKey: ["skill_tracks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("skill_tracks").select("*").eq("is_default", true);
      if (error) throw error;
      return data;
    },
  });

  const toggleTrack = (trackId: string) => {
    setSelectedTracks((prev) =>
      prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]
    );
  };

  const handleSubmit = async () => {
    if (selectedTracks.length === 0) {
      toast.error("Please select at least one skill track.");
      return;
    }
    setLoading(true);
    try {
      // Update profile with role
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", user!.id);
      if (profileError) throw profileError;

      // Get all skills for selected tracks
      const { data: skills, error: skillsError } = await supabase
        .from("skills")
        .select("id")
        .in("track_id", selectedTracks);
      if (skillsError) throw skillsError;

      // Initialize progress rows
      if (skills && skills.length > 0) {
        const progressRows = skills.map((skill) => ({
          user_id: user!.id,
          skill_id: skill.id,
          status: "not_started" as const,
        }));
        const { error: progressError } = await supabase
          .from("user_skill_progress")
          .upsert(progressRows, { onConflict: "user_id,skill_id" });
        if (progressError) throw progressError;
      }

      toast.success("You're all set! Let's start tracking.");
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to SkillTracker 🚀</CardTitle>
          <CardDescription>Let's personalize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-semibold">I am a...</Label>
            <RadioGroup value={role} onValueChange={setRole} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="junior" id="junior" />
                <Label htmlFor="junior">Junior (Learning)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="senior" id="senior" />
                <Label htmlFor="senior">Senior (Mentoring)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-semibold">Pick your skill tracks</Label>
            <div className="space-y-2">
              {tracks?.map((track) => (
                <div key={track.id} className="flex items-start space-x-3 rounded-lg border p-3">
                  <Checkbox
                    id={track.id}
                    checked={selectedTracks.includes(track.id)}
                    onCheckedChange={() => toggleTrack(track.id)}
                  />
                  <div>
                    <Label htmlFor={track.id} className="font-medium cursor-pointer">
                      {track.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">{track.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={loading}>
            {loading ? "Setting up..." : "Get Started"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;
