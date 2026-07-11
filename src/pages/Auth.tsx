import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, Zap } from "lucide-react";
import appIcon from "@/assets/app-icon-512.png";
import { supabase } from "@/integrations/supabase/client";
import FullscreenLoader from "@/components/FullscreenLoader";
import PhoneAuthForm from "@/components/auth/PhoneAuthForm";

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
            Sign in with your mobile number to continue.
          </p>
        </div>

        <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-primary/50 via-white/10 to-transparent shadow-2xl">
          <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-white/5 p-6 sm:p-7 space-y-5">
            <PhoneAuthForm
              onSuccess={() => { /* AuthContext picks up session and routes */ }}
              onBack={() => { /* no-op: phone is the only method */ }}
              hideBack
            />

            <ul className="space-y-2.5 pt-1 border-t border-border/40">
              {PERKS.map(({ icon: Icon, text }, i) => (
                <motion.li
                  key={text}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                  className={`flex items-center gap-3 text-sm text-muted-foreground ${i === 0 ? "pt-4" : ""}`}
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
