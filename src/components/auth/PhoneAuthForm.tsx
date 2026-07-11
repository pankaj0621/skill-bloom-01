import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Phone } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

const HUMANIZED_ERRORS: Record<string, string> = {
  "auth/invalid-phone-number": "Invalid phone number. Use +91XXXXXXXXXX format.",
  "auth/missing-phone-number": "Enter a phone number.",
  "auth/quota-exceeded": "Too many attempts. Try again later.",
  "auth/captcha-check-failed": "Verification failed. Try again.",
  "auth/invalid-verification-code": "Invalid OTP. Please try again.",
  "auth/code-expired": "OTP expired. Request a new one.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/invalid-verification-id": "Session expired. Send a new OTP.",
  "auth/missing-verification-code": "Enter the OTP.",
  "auth/user-disabled": "This account has been disabled.",
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
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaContainerRef = useRef<HTMLDivElement | null>(null);

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
          <Button type="submit" className="w-full h-11" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send OTP
          </Button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="otp">Enter OTP</Label>
            <p className="text-xs text-muted-foreground">Sent to {phone}</p>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "");
                setOtp(v);
              }}
              placeholder="000000"
              className="text-center text-lg tracking-[0.5em]"
              autoComplete="one-time-code"
              required
            />
          </div>
          <Button type="submit" className="w-full h-11" disabled={loading || otp.length !== 6}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Verify & continue
          </Button>
          <div className="text-center">
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || loading}
              className="text-sm text-primary hover:underline disabled:opacity-50"
            >
              Resend {countdown > 0 ? `(${countdown}s)` : ""}
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
