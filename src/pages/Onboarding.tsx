import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ImmersiveLayout from "@/components/ImmersiveLayout";
import FullscreenLoader from "@/components/FullscreenLoader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Loader2, Sparkles, ArrowRight, ArrowLeft, Rocket } from "lucide-react";

const STREAMS = [
  { value: "btech", label: "BTech", icon: "💻" },
  { value: "ba", label: "BA", icon: "📚" },
  { value: "bcom", label: "BCom", icon: "📊" },
  { value: "bsc", label: "BSc", icon: "🔬" },
  { value: "other", label: "Other", icon: "✨" },
];

const GOALS = [
  { value: "job", label: "Get a Job", icon: "💼", desc: "Land your dream role" },
  { value: "higher_studies", label: "Higher Studies", icon: "🎓", desc: "Masters / PhD path" },
  { value: "competitive_exams", label: "Competitive Exams", icon: "📝", desc: "UPSC, GATE, etc." },
  { value: "skill_career", label: "Skill Career", icon: "🛠️", desc: "Freelance / build" },
];

type CachedProfile = { username?: string | null; role?: string | null; stream?: string | null } | null;

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Read the auth check cache synchronously so a completed user never even
  // sees the form paint before we redirect.
  const initialCached = user
    ? (queryClient.getQueryData<CachedProfile>(["profile-onboarding-check", user.id]) ?? null)
    : null;
  const initiallyComplete = !!(
    initialCached?.username || (initialCached?.role && initialCached?.stream)
  );

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || user?.user_metadata?.display_name || ""
  );
  const [role, setRole] = useState<string>("junior");
  const [stream, setStream] = useState<string>("");
  const [primaryGoal, setPrimaryGoal] = useState<string>("");
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // While we're fetching profile / redirecting, show a loader instead of the
  // form so there's no flicker between splash → onboarding → dashboard.
  const [bootstrapping, setBootstrapping] = useState(true);
  const [redirecting, setRedirecting] = useState(initiallyComplete);

  // Prefill if user already partially onboarded (avoids loop on retry).
  // If already fully onboarded, bounce straight to /dashboard so a stale
  // persisted query cache can't strand a returning user on this screen.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, role, stream, primary_goal")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const complete = !!data.username || (!!data.role && !!data.stream);
        if (complete) {
          queryClient.setQueryData(["profile-onboarding-check", user.id], data);
          setRedirecting(true);
          navigate("/dashboard", { replace: true });
          return;
        }
        if (data.username) {
          setUsername(data.username);
          setUsernameStatus("available");
        }
        if (data.display_name) setDisplayName(data.display_name);
        if (data.role) setRole(data.role);
        if (data.stream) setStream(data.stream);
        if (data.primary_goal) setPrimaryGoal(data.primary_goal);
      }
      setBootstrapping(false);
    })();
    return () => { cancelled = true; };
  }, [user, navigate, queryClient]);

  if (bootstrapping || redirecting) {
    return <FullscreenLoader label={redirecting ? "Taking you in..." : "Loading..."} />;
  }


  const checkUsername = useCallback(async (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(clean);
    if (clean.length < 3) {
      setUsernameStatus(clean.length > 0 ? "invalid" : "idle");
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", clean)
      .neq("id", user!.id)
      .maybeSingle();
    setUsernameStatus(data ? "taken" : "available");
  }, [user]);

  const { data: tracks } = useQuery({
    queryKey: ["skill_tracks", stream],
    queryFn: async () => {
      let query = supabase.from("skill_tracks").select("*").eq("is_default", true);
      if (stream) query = query.eq("stream", stream);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!stream,
  });

  const toggleTrack = (trackId: string) =>
    setSelectedTracks((prev) => (prev.includes(trackId) ? prev.filter((id) => id !== trackId) : [...prev, trackId]));

  const handleSubmit = async () => {
    if (!username || usernameStatus !== "available") return toast.error("Please choose a valid username.");
    if (!stream) return toast.error("Please select your stream.");
    if (!primaryGoal) return toast.error("Please select your primary goal.");
    if (selectedTracks.length === 0) return toast.error("Please select at least one skill track.");

    setLoading(true);
    try {
      // Upsert ensures the row exists even if the auth trigger never created it
      const profileData = {
        id: user!.id,
        username,
        display_name: displayName.trim() || username,
        role,
        stream,
        primary_goal: primaryGoal,
      };
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "id" });
      if (profileError) throw profileError;

      // Verify the write actually persisted (catches silent RLS issues)
      const { data: verify } = await supabase
        .from("profiles")
        .select("username, role, stream")
        .eq("id", user!.id)
        .maybeSingle();
      if (!verify?.username) throw new Error("Profile didn't save. Please try again.");

      // Seed skill progress
      const { data: skills } = await supabase
        .from("skills")
        .select("id")
        .in("track_id", selectedTracks);

      if (skills && skills.length > 0) {
        const progressRows = skills.map((skill) => ({
          user_id: user!.id,
          skill_id: skill.id,
          status: "not_started" as const,
        }));
        await supabase
          .from("user_skill_progress")
          .upsert(progressRows, { onConflict: "user_id,skill_id" });
      }

      // Prime the cache so ProtectedRoute sees the new profile immediately — no race
      queryClient.setQueryData(["profile-onboarding-check", user!.id], verify);
      await queryClient.invalidateQueries({ queryKey: ["profile-onboarding-check", user!.id] });

      toast.success("You're all set! Welcome to Level Up 🚀");
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 4;
  const canGoNext =
    (step === 1 && usernameStatus === "available") ||
    (step === 2 && !!stream) ||
    (step === 3 && !!primaryGoal);

  const goNext = () => {
    if (step === 1 && usernameStatus !== "available") return toast.error("Pick a valid username first.");
    if (step === 2 && !stream) return toast.error("Pick your stream.");
    if (step === 3 && !primaryGoal) return toast.error("Pick your primary goal.");
    if (step === 2) setSelectedTracks([]);
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  return (
    <ImmersiveLayout center gradient className="p-4">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Hero header */}
        <div className="text-center mb-6">
          <motion.div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30 mb-4"
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            <Sparkles className="w-7 h-7 text-primary-foreground" />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Level Up</h1>
          <p className="text-sm text-muted-foreground mt-1">Let's set up your journey — takes 30 seconds</p>
        </div>

        {/* Progress segments */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <motion.div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-primary" : "bg-muted"}`}
              animate={{ opacity: i < step ? 1 : 0.4 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="s1"
                className="space-y-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div>
                  <h2 className="text-lg font-semibold">Pick a username</h2>
                  <p className="text-xs text-muted-foreground">This is how others find you.</p>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      value={username}
                      onChange={(e) => checkUsername(e.target.value)}
                      placeholder="your_username"
                      className="pl-8 pr-10 h-12 text-base"
                      maxLength={30}
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      {usernameStatus === "available" && <Check className="h-4 w-4 text-green-500" />}
                      {(usernameStatus === "taken" || usernameStatus === "invalid") && <X className="h-4 w-4 text-destructive" />}
                    </div>
                  </div>
                  <p className="text-xs h-4">
                    {usernameStatus === "idle" && <span className="text-muted-foreground">3–30 chars · a–z, 0–9, _</span>}
                    {usernameStatus === "checking" && <span className="text-muted-foreground">Checking…</span>}
                    {usernameStatus === "available" && <span className="text-green-500">✓ Available</span>}
                    {usernameStatus === "taken" && <span className="text-destructive">Username already taken</span>}
                    {usernameStatus === "invalid" && <span className="text-destructive">Min 3 chars · a–z, 0–9, _ only</span>}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Display name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name"
                    className="h-12"
                    maxLength={50}
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="s2"
                className="space-y-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div>
                  <h2 className="text-lg font-semibold">What are you studying?</h2>
                  <p className="text-xs text-muted-foreground">We'll personalize your tracks.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">I am a</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { v: "junior", l: "Student", d: "Learning" },
                      { v: "senior", l: "Peer Guide", d: "Mentoring" },
                    ].map((r) => (
                      <button
                        key={r.v}
                        type="button"
                        onClick={() => setRole(r.v)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          role === r.v ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <p className="font-medium text-sm">{r.l}</p>
                        <p className="text-xs text-muted-foreground">{r.d}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Stream</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {STREAMS.map((s) => (
                      <motion.button
                        key={s.value}
                        type="button"
                        whileTap={{ scale: 0.96 }}
                        className={`rounded-xl border p-3 text-center transition-all ${
                          stream === s.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => setStream(s.value)}
                      >
                        <div className="text-xl mb-0.5">{s.icon}</div>
                        <div className="text-xs font-medium">{s.label}</div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="s3"
                className="space-y-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div>
                  <h2 className="text-lg font-semibold">What's your main goal?</h2>
                  <p className="text-xs text-muted-foreground">We'll tailor your roadmap.</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((g) => (
                    <motion.button
                      key={g.value}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setPrimaryGoal(g.value)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        primaryGoal === g.value ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="text-2xl mb-1">{g.icon}</div>
                      <p className="text-sm font-semibold">{g.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{g.desc}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="s4"
                className="space-y-5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <div>
                  <h2 className="text-lg font-semibold">Pick your skill tracks</h2>
                  <p className="text-xs text-muted-foreground">Choose one or more to start.</p>
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {!tracks && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {tracks?.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No default tracks for this stream yet. You can add custom skills later.
                    </p>
                  )}
                  {tracks?.map((track) => {
                    const selected = selectedTracks.includes(track.id);
                    return (
                      <button
                        type="button"
                        key={track.id}
                        onClick={() => toggleTrack(track.id)}
                        className={`w-full flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                          selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`mt-0.5 inline-flex items-center justify-center h-4 w-4 shrink-0 rounded border ${
                            selected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-input bg-background"
                          }`}
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{track.name}</p>
                          {track.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{track.description}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer nav */}
          <div className="flex gap-2 mt-6">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="flex-1" disabled={loading}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < totalSteps ? (
              <Button onClick={goNext} className="flex-1" disabled={!canGoNext}>
                Continue <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="flex-1" disabled={loading || selectedTracks.length === 0}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up…</>
                ) : (
                  <><Rocket className="w-4 h-4 mr-2" /> Let's Go</>
                )}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Step {step} of {totalSteps}
        </p>
      </motion.div>
    </ImmersiveLayout>

  );
};

export default Onboarding;
