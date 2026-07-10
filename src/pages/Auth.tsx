import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Sparkles, ShieldCheck, Zap, Eye, EyeOff, Mail, Lock } from "lucide-react";
import appIcon from "@/assets/app-icon-512.png";
import { supabase } from "@/integrations/supabase/client";
import FullscreenLoader from "@/components/FullscreenLoader";

const PERKS = [
  { icon: Zap, text: "Track skills & earn XP daily" },
  { icon: Sparkles, text: "AI mentor + personalized roadmap" },
  { icon: ShieldCheck, text: "Private, secure sign-in" },
];

const isSafeSameOriginPath = (p: unknown): p is string =>
  typeof p === "string" && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/auth");

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [routing, setRouting] = useState(false);

  const intendedFromState = (location.state as { from?: string } | null)?.from;
  const intendedFromQuery = new URLSearchParams(location.search).get("next");
  const intendedPath =
    (isSafeSameOriginPath(intendedFromState) && intendedFromState) ||
    (isSafeSameOriginPath(intendedFromQuery) && intendedFromQuery) ||
    "/dashboard";

  useEffect(() => {
    if (!user || routing) return;
    let cancelled = false;
    setRouting(true);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, role, stream")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      queryClient.setQueryData(["profile-onboarding-check", user.id], data);
      const complete = !!(data?.username || (data?.role && data?.stream));
      navigate(complete ? intendedPath : "/onboarding", { replace: true });
    })();
    return () => { cancelled = true; };
  }, [user, routing, navigate, intendedPath, queryClient]);

  if (authLoading || user) return <FullscreenLoader label="Signing you in..." />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    if (mode === "signup" && password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) {
          if (/already/i.test(error.message)) {
            toast.error("An account already exists with this email. Try signing in.");
            setMode("signin");
          } else {
            toast.error(error.message);
          }
          setLoading(false);
          return;
        }
        toast.success("Account created! Signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password,
        });
        if (error) {
          toast.error(/invalid/i.test(error.message)
            ? "Invalid email or password."
            : error.message);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      toast.error("Enter your email above first.");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Password reset link sent. Check your inbox.");
  };

  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-background flex items-center justify-center p-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-primary/25 blur-[130px]" />
        <div className="absolute -bottom-40 -right-32 w-[480px] h-[480px] rounded-full bg-fuchsia-500/15 blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent_60%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-2xl bg-primary/50 blur-2xl" />
            <img
              src={appIcon}
              alt="Level Up"
              className="relative w-[68px] h-[68px] rounded-2xl shadow-2xl ring-1 ring-white/10"
              loading="lazy"
              decoding="async"
            />
          </motion.div>
          <h1 className="mt-5 text-[28px] leading-tight font-bold tracking-tight text-foreground">
            Welcome to Level Up
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to continue your streak." : "Create your account in seconds."}
          </p>
        </div>

        <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-primary/50 via-white/10 to-transparent shadow-2xl">
          <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-white/5 p-6 sm:p-7 space-y-5">
            <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value={mode} className="mt-5">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-11"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={handleForgot}
                          className="text-xs text-primary hover:underline"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        autoComplete={mode === "signin" ? "current-password" : "new-password"}
                        placeholder={mode === "signup" ? "At least 6 characters" : "••••••••"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-9 pr-10 h-11"
                        required
                        minLength={mode === "signup" ? 6 : undefined}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((s) => !s)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground"
                        aria-label={showPw ? "Hide password" : "Show password"}
                      >
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : mode === "signin" ? (
                      "Sign in"
                    ) : (
                      "Create account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <ul className="space-y-2.5 pt-1">
              {PERKS.map(({ icon: Icon, text }, i) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                  className="flex items-center gap-3 text-sm text-muted-foreground"
                >
                  <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/15 text-primary shrink-0">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {text}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground px-6 leading-relaxed">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
