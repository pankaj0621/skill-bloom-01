import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (user) return <Navigate to="/dashboard" replace />;

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
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
                <Button type="submit" className="w-full h-11" disabled={loading}>
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
