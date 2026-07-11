import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Phone, ShieldCheck, Pencil } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";
import { firebaseAuth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { checkFirebaseConfig } from "@/lib/firebaseConfigCheck";
import FirebaseConfigWarning from "@/components/auth/FirebaseConfigWarning";

type ErrInfo = { message: string; expired?: boolean };
const HUMANIZED_ERRORS: Record<string, ErrInfo> = {
  "auth/invalid-phone-number": { message: "That phone number doesn't look right. Use format like +91XXXXXXXXXX." },
  "auth/missing-phone-number": { message: "Please enter your phone number." },
  "auth/quota-exceeded": { message: "SMS limit reached for today. Please try again later." },
  "auth/captcha-check-failed": { message: "Security check failed. Refresh and try again." },
  "auth/invalid-verification-code": { message: "The code you entered is incorrect. Please double-check and try again." },
  "auth/code-expired": { message: "This code has expired. Tap Resend to get a new one.", expired: true },
  "auth/session-expired": { message: "Your verification session expired. Tap Resend to get a new code.", expired: true },
  "auth/too-many-requests": { message: "Too many attempts. Please wait a few minutes before trying again." },
  "auth/invalid-verification-id": { message: "Verification session expired. Please request a new code.", expired: true },
  "auth/missing-verification-code": { message: "Please enter the 6-digit code." },
  "auth/user-disabled": { message: "This account has been disabled. Contact support for help." },
  "auth/network-request-failed": { message: "Network error. Check your connection and try again." },
  "auth/credential-already-in-use": { message: "This phone number is already linked to another account." },
};


interface PhoneAuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

const PhoneAuthForm = ({ onSuccess, onBack }: PhoneAuthFormProps) => {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [otpError, setOtpError] = useState<ErrInfo | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);
  const configIssues = useRef(checkFirebaseConfig()).current;
  const configOk = configIssues.length === 0;

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  const ensureVerifier = () => {
    if (!recaptchaContainerRef.current) return null;
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(firebaseAuth, recaptchaContainerRef.current, {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => {
          toast.error("reCAPTCHA expired. Please try again.");
        },
      });
    }
    return window.recaptchaVerifier;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!configOk) {
      toast.error("Firebase is not configured. See warning below.");
      return;
    }
    setLoading(true);
    try {
      const verifier = ensureVerifier();
      if (!verifier) {
        toast.error("reCAPTCHA not ready. Try again.");
        setLoading(false);
        return;
      }
      const confirmation = await signInWithPhoneNumber(firebaseAuth, phone, verifier);
      confirmationResultRef.current = confirmation;
      setStep("otp");
      setCountdown(30);
      toast.success("OTP sent!");
    } catch (err) {
      const code = (err as { code?: string })?.code || "";
      console.error("send OTP error", err);
      toast.error(HUMANIZED_ERRORS[code] || "Failed to send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !confirmationResultRef.current) return;
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP.");
      return;
    }
    setLoading(true);
    try {
      const result = await confirmationResultRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();
      const { data, error } = await supabase.functions.invoke("firebase-auth", {
        body: { idToken },
      });
      if (error) {
        const detail = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
        console.error("firebase-auth function error", detail);
        toast.error(detail || "Sign-in failed.");
        setLoading(false);
        return;
      }
      if (!data?.access_token || !data?.refresh_token) {
        toast.error(data?.error || "Sign-in failed. Try again.");
        setLoading(false);
        return;
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
      if (sessionError) {
        toast.error(sessionError.message);
        setLoading(false);
        return;
      }
      toast.success("Signed in successfully!");
      onSuccess();
    } catch (err) {
      const code = (err as { code?: string })?.code || "";
      console.error("verify OTP error", err);
      toast.error(HUMANIZED_ERRORS[code] || "Failed to verify OTP. Try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || loading) return;
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {
        // ignore
      }
      window.recaptchaVerifier = undefined;
    }
    await handleSendOtp({ preventDefault: () => {} } as React.FormEvent);
  };

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="h-8 px-2 -ml-2" type="button">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>

      <FirebaseConfigWarning issues={configIssues} />

      {step === "phone" ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91XXXXXXXXXX"
                className="pl-9"
                autoComplete="tel"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">Include country code (e.g. +91).</p>
          </div>
          <div ref={recaptchaContainerRef} className="hidden" aria-hidden="true" />
          <Button type="submit" className="w-full h-11" disabled={loading || !configOk}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center ring-1 ring-primary/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">Verify your number</h3>
            <p className="text-sm text-muted-foreground">
              We sent a 6-digit code to <span className="font-medium text-foreground">{phone}</span>
            </p>
            <button
              type="button"
              onClick={() => {
                setOtp("");
                setStep("phone");
              }}
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Pencil className="h-3 w-3" />
              Change number
            </button>
          </div>

          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={(v) => setOtp(v.replace(/\D/g, ""))}
              autoFocus
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button type="submit" className="w-full h-11" disabled={loading || otp.length !== 6}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Verify & continue
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Didn't get the code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || loading}
              className="text-primary font-medium hover:underline disabled:opacity-50 disabled:no-underline"
            >
              {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
            </button>
          </div>
        </form>

      )}
    </div>
  );
};

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

export default PhoneAuthForm;
