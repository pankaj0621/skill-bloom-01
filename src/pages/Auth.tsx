import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Loader2, Phone, ShieldCheck, Sparkles } from "lucide-react";
import appIcon from "@/assets/app-icon-512.png";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.87-3.04.87-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"/>
    <path fill="#FBBC05" d="M3.97 10.73A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.73V4.94H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.06l3.01-2.33z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
  </svg>
);

const COUNTRIES = [
  { code: "+91", label: "🇮🇳 India (+91)" },
  { code: "+1", label: "🇺🇸 USA (+1)" },
  { code: "+44", label: "🇬🇧 UK (+44)" },
  { code: "+61", label: "🇦🇺 Australia (+61)" },
  { code: "+971", label: "🇦🇪 UAE (+971)" },
  { code: "+65", label: "🇸🇬 Singapore (+65)" },
  { code: "+49", label: "🇩🇪 Germany (+49)" },
  { code: "+33", label: "🇫🇷 France (+33)" },
  { code: "+81", label: "🇯🇵 Japan (+81)" },
  { code: "+880", label: "🇧🇩 Bangladesh (+880)" },
  { code: "+92", label: "🇵🇰 Pakistan (+92)" },
];

const Auth = () => {
  const { user } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [country, setCountry] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  if (user) return <Navigate to="/dashboard" replace />;

  const fullPhone = `${country}${phone.replace(/\D/g, "")}`;

  const handleGoogle = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
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
        setGoogleLoading(false);
        return;
      }
      if (result.redirected) return;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
      setGoogleLoading(false);
    }
  };

  const sendOtp = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 6) {
      toast.error("Enter a valid phone number");
      return;
    }
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) throw error;
      toast.success(`OTP sent to ${fullPhone}`);
      setStep("otp");
      setResendIn(30);
    } catch (err: any) {
      const msg = err?.message || "Could not send OTP";
      if (/provider.*disabled|not enabled|unsupported/i.test(msg)) {
        toast.error("Phone sign-in isn't enabled yet. Please use Google for now.");
      } else {
        toast.error(msg);
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async (code: string) => {
    setOtpLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: code,
        type: "sms",
      });
      if (error) throw error;
      toast.success("Signed in!");
    } catch (err: any) {
      toast.error(err?.message || "Invalid or expired code");
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-background flex items-center justify-center p-4">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-32 w-[480px] h-[480px] rounded-full bg-fuchsia-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.04),transparent_60%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-2xl bg-primary/40 blur-xl" />
            <img
              src={appIcon}
              alt="Level Up"
              className="relative w-16 h-16 rounded-2xl shadow-2xl ring-1 ring-white/10"
              loading="lazy"
              decoding="async"
            />
          </motion.div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
            Welcome to Level Up
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Track skills. Earn XP. Level up daily.
          </p>
        </div>

        {/* Glass card */}
        <div className="relative rounded-2xl p-[1px] bg-gradient-to-br from-primary/40 via-white/10 to-transparent">
          <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-white/5 p-6 sm:p-7 shadow-2xl">
            <AnimatePresence mode="wait">
              {step === "phone" ? (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  {/* Google */}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 gap-3 text-[15px] font-medium bg-background/60 hover:bg-background border-white/10"
                    onClick={handleGoogle}
                    disabled={googleLoading}
                  >
                    {googleLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <GoogleIcon />
                    )}
                    {googleLoading ? "Connecting…" : "Continue with Google"}
                  </Button>

                  {/* Divider */}
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/10" />
                    </div>
                    <div className="relative flex justify-center text-[11px] uppercase tracking-widest">
                      <span className="bg-card/80 px-3 text-muted-foreground">or</span>
                    </div>
                  </div>

                  {/* Phone form */}
                  <div className="space-y-3">
                    <Label htmlFor="phone" className="text-sm flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      Phone number
                    </Label>
                    <div className="flex gap-2">
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger className="w-[112px] h-12 bg-background/60 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {COUNTRIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") sendOtp();
                        }}
                        className="h-12 flex-1 bg-background/60 border-white/10 text-base"
                      />
                    </div>
                    <Button
                      type="button"
                      className="w-full h-12 text-[15px] font-medium"
                      onClick={sendOtp}
                      disabled={otpLoading || !phone.trim()}
                    >
                      {otpLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>Send verification code</>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                    }}
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Change number
                  </button>

                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 text-primary mb-2">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <h2 className="text-lg font-semibold">Enter verification code</h2>
                    <p className="text-xs text-muted-foreground">
                      We sent a 6-digit code to{" "}
                      <span className="text-foreground font-medium">{fullPhone}</span>
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otp}
                      onChange={(v) => {
                        setOtp(v);
                        if (v.length === 6) verifyOtp(v);
                      }}
                      autoFocus
                    >
                      <InputOTPGroup>
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <InputOTPSlot key={i} index={i} className="w-11 h-12 text-lg" />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <Button
                    type="button"
                    className="w-full h-12 text-[15px] font-medium"
                    disabled={otp.length !== 6 || otpLoading}
                    onClick={() => verifyOtp(otp)}
                  >
                    {otpLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Verify & continue"
                    )}
                  </Button>

                  <div className="text-center text-xs text-muted-foreground">
                    {resendIn > 0 ? (
                      <>Resend code in {resendIn}s</>
                    ) : (
                      <button
                        type="button"
                        onClick={sendOtp}
                        className="text-primary hover:underline font-medium"
                        disabled={otpLoading}
                      >
                        Resend code
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground px-6 leading-relaxed">
          By continuing, you agree to our Terms of Service and acknowledge our Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
