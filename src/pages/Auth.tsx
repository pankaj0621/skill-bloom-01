import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import appIcon from "@/assets/app-icon-512.png";
import PasswordInput from "@/components/PasswordInput";
import PasswordStrength from "@/components/PasswordStrength";
import { checkRateLimit, formatRetryTime } from "@/lib/rateLimiter";

type AuthMode = "login" | "signup";

const Auth = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (user) return <Navigate to="/dashboard" replace />;

  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast.error("Google sign-in failed. Please try again.");
        console.error("Google OAuth error:", error);
      }
    } catch (err: any) {
      toast.error("Google sign-in failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const { allowed, retryAfterMs } = checkRateLimit("login", 5, 60_000);
    if (!allowed) {
      toast.error(`Too many login attempts. Try again in ${formatRetryTime(retryAfterMs)}.`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast.error("Please verify your email. Check your inbox.");
        } else if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password.");
        } else {
          toast.error(error.message);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const { allowed, retryAfterMs } = checkRateLimit("signup", 3, 120_000);
    if (!allowed) {
      toast.error(`Too many signup attempts. Try again in ${formatRetryTime(retryAfterMs)}.`);
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
      } else if (data.session) {
        toast.success("Account created successfully! Welcome aboard!");
      } else {
        toast.success("Account created! Please check your email to verify.");
      }
    } catch (err: any) {
      toast.error(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (newMode: AuthMode) => {
    setMode(newMode);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        key={mode}
      >
        <Card>
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            >
              <img src={appIcon} alt="SkillTracker" className="w-16 h-16 rounded-xl shadow-lg mx-auto mb-3" loading="lazy" decoding="async" />
              <CardTitle className="text-2xl font-bold">SkillTracker</CardTitle>
            </motion.div>
            <CardDescription>
              {mode === "login" && "Sign in to your account"}
              {mode === "signup" && "Create a new account"}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {/* Google OAuth Button */}
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 gap-2"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Continue with Google
              </Button>
            </motion.div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <form onSubmit={mode === "login" ? handleLogin : handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={6}
                />
                {mode === "signup" && <PasswordStrength password={password} />}
              </div>

              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
              )}

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button type="submit" className="w-full h-11" disabled={loading || googleLoading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  {mode === "login" && (loading ? "Logging in..." : "Login")}
                  {mode === "signup" && (loading ? "Signing up..." : "Sign Up")}
                </Button>
              </motion.div>
            </form>

            <div className="text-center mt-4">
              {mode === "login" ? (
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium min-h-0"
                    data-small-target
                    onClick={() => resetForm("signup")}
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium min-h-0"
                    data-small-target
                    onClick={() => resetForm("login")}
                  >
                    Login
                  </button>
                </p>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              By signing in, you agree to our terms of service
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
