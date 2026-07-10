import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Sparkles, ShieldCheck, Zap } from "lucide-react";
import appIcon from "@/assets/app-icon-512.png";
import { lovable } from "@/integrations/lovable/index";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.97 10.73A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.73V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.33z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
  </svg>
);

const PERKS = [
  { icon: Zap, text: "Track skills & earn XP daily" },
  { icon: Sparkles, text: "AI mentor + personalized roadmap" },
  { icon: ShieldCheck, text: "Private, secure, one-tap sign-in" },
];

const Auth = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleGoogle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) {
        const msg = result.error.message || "";
        if (/cancel|closed|popup/i.test(msg)) {
          toast.error("Sign-in window was closed. Try again and keep the Google window open.");
        } else if (/popup.*block/i.test(msg)) {
          toast.error("Popup blocked. Allow popups for this site and retry.");
        } else {
          toast.error(msg || "Google sign-in failed");
        }
        setLoading(false);
        return;
      }
      if (result.redirected) return;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-background flex items-center justify-center p-4">
      {/* Ambient glow */}
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
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-7">
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
            Sign in to continue your learning streak.
          </p>
        </div>

        {/* Glass card */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-primary/50 via-white/10 to-transparent shadow-2xl">
          <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-white/5 p-6 sm:p-7 space-y-6">
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 gap-3 text-[15px] font-medium bg-background/70 hover:bg-background border-white/10"
                onClick={handleGoogle}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                {loading ? "Connecting…" : "Continue with Google"}
              </Button>
            </motion.div>

            <ul className="space-y-2.5">
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
