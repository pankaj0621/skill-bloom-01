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
import { motion, AnimatePresence } from "framer-motion";

const STREAMS = [
  { value: "btech", label: "BTech" },
  { value: "ba", label: "BA" },
  { value: "bcom", label: "BCom" },
  { value: "bsc", label: "BSc" },
  { value: "other", label: "Other" },
];

const GOALS = [
  { value: "job", label: "Job", icon: "💼" },
  { value: "higher_studies", label: "Higher Studies", icon: "🎓" },
  { value: "competitive_exams", label: "Competitive Exams", icon: "📝" },
  { value: "skill_career", label: "Skill-based Career", icon: "🛠️" },
];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<string>("junior");
  const [stream, setStream] = useState<string>("");
  const [primaryGoal, setPrimaryGoal] = useState<string>("");
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
    if (!stream) { toast.error("Please select your stream."); return; }
    if (!primaryGoal) { toast.error("Please select your primary goal."); return; }
    if (selectedTracks.length === 0) { toast.error("Please select at least one skill track."); return; }
    setLoading(true);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role, stream, primary_goal: primaryGoal })
        .eq("id", user!.id);
      if (profileError) throw profileError;

      const { data: skills, error: skillsError } = await supabase
        .from("skills")
        .select("id")
        .in("track_id", selectedTracks);
      if (skillsError) throw skillsError;

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

  const totalSteps = 3;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Card>
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            >
              <CardTitle className="text-2xl">Welcome to SkillTracker 🚀</CardTitle>
            </motion.div>
            <CardDescription>Step {step} of {totalSteps} — Let's personalize your experience</CardDescription>
            <div className="flex gap-1.5 justify-center pt-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <motion.div
                  key={i}
                  className={`h-1.5 rounded-full transition-colors ${i < step ? "bg-primary" : "bg-muted"}`}
                  initial={{ width: 0 }}
                  animate={{ width: i < step ? 40 : 24 }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  className="space-y-5"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
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
                    <Label className="text-base font-semibold">My stream / course</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {STREAMS.map((s, i) => (
                        <motion.button
                          key={s.value}
                          type="button"
                          className={`rounded-lg border p-3 text-sm font-medium transition-colors ${stream === s.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"}`}
                          onClick={() => setStream(s.value)}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.05 }}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                        >
                          {s.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <Button onClick={() => { if (!stream) { toast.error("Please select your stream."); return; } setStep(2); }} className="w-full">
                    Next →
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  className="space-y-5"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">What's your primary goal?</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {GOALS.map((g, i) => (
                        <motion.button
                          key={g.value}
                          type="button"
                          className={`rounded-xl border p-4 text-left transition-colors ${primaryGoal === g.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
                          onClick={() => setPrimaryGoal(g.value)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: i * 0.07 }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <span className="text-2xl">{g.icon}</span>
                          <p className="mt-1 text-sm font-medium">{g.label}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(1)} className="flex-1">← Back</Button>
                    <Button onClick={() => { if (!primaryGoal) { toast.error("Please select your goal."); return; } setStep(3); }} className="flex-1">Next →</Button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  className="space-y-5"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Pick your skill tracks</Label>
                    <div className="space-y-2">
                      {tracks?.map((track, i) => (
                        <motion.div
                          key={track.id}
                          className="flex items-start space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.08 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleTrack(track.id)}
                        >
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
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">← Back</Button>
                    <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button onClick={handleSubmit} className="w-full" disabled={loading}>
                        {loading ? "Setting up..." : "Get Started 🎉"}
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Onboarding;
