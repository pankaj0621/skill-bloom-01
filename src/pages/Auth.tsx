import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2, Sparkles, ShieldCheck, Zap } from "lucide-react";
import appIcon from "@/assets/app-icon-512.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });

      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed. Please try again.");
        setLoading(false);
        return;
      }

      if (result.redirected) return;

      toast.success("Signed in successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
      setLoading(false);
    }
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
            Sign in once and continue your learning streak.
          </p>
        </div>

        <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-primary/50 via-white/10 to-transparent shadow-2xl">
          <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-white/5 p-6 sm:p-7 space-y-5">
            <Button
              type="button"
              variant="secondary"
              className="w-full h-12 font-semibold gap-3"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon className="h-5 w-5" />
              )}
              Continue with Google
            </Button>

            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              Use the same Google account every time to keep your XP, streaks, badges, and messages synced.
            </p>

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

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
  </svg>
);

export default Auth;
