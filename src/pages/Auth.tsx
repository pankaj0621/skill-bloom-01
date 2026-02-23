import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Phone, Loader2, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COUNTRY_CODES = [
  { code: "+91", country: "🇮🇳 India", short: "IN" },
  { code: "+1", country: "🇺🇸 USA", short: "US" },
  { code: "+44", country: "🇬🇧 UK", short: "GB" },
  { code: "+61", country: "🇦🇺 Australia", short: "AU" },
  { code: "+971", country: "🇦🇪 UAE", short: "AE" },
  { code: "+966", country: "🇸🇦 Saudi Arabia", short: "SA" },
  { code: "+65", country: "🇸🇬 Singapore", short: "SG" },
  { code: "+60", country: "🇲🇾 Malaysia", short: "MY" },
  { code: "+977", country: "🇳🇵 Nepal", short: "NP" },
  { code: "+880", country: "🇧🇩 Bangladesh", short: "BD" },
  { code: "+92", country: "🇵🇰 Pakistan", short: "PK" },
  { code: "+94", country: "🇱🇰 Sri Lanka", short: "LK" },
  { code: "+49", country: "🇩🇪 Germany", short: "DE" },
  { code: "+33", country: "🇫🇷 France", short: "FR" },
  { code: "+81", country: "🇯🇵 Japan", short: "JP" },
  { code: "+86", country: "🇨🇳 China", short: "CN" },
  { code: "+82", country: "🇰🇷 South Korea", short: "KR" },
  { code: "+55", country: "🇧🇷 Brazil", short: "BR" },
  { code: "+27", country: "🇿🇦 South Africa", short: "ZA" },
  { code: "+234", country: "🇳🇬 Nigeria", short: "NG" },
];

const Auth = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  // Phone OTP state
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    const rawDigits = phone.replace(/\D/g, "");
    const formattedPhone = `${countryCode}${rawDigits}`;
    if (!/^\+[1-9]\d{6,14}$/.test(formattedPhone)) {
      toast.error("Enter a valid phone number");
      return;
    }

    setPhoneLoading(true);
    try {
      const res = await supabase.functions.invoke("send-otp", {
        body: { phone: formattedPhone },
      });

      if (res.error) throw new Error(res.error.message || "Failed to send OTP");
      if (res.data?.error) throw new Error(res.data.error);

      setOtpSent(true);
      setPhone(formattedPhone);
      toast.success("OTP sent to your phone!");
    } catch (err: any) {
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error("Enter the 6-digit OTP");
      return;
    }

    setPhoneLoading(true);
    try {
      const res = await supabase.functions.invoke("verify-otp", {
        body: { phone, code: otp },
      });

      if (res.error) throw new Error(res.error.message || "Verification failed");
      if (res.data?.error) throw new Error(res.data.error);

      if (res.data?.session) {
        // Set the session in supabase client
        await supabase.auth.setSession({
          access_token: res.data.session.access_token,
          refresh_token: res.data.session.refresh_token,
        });

        if (res.data.isNewUser) {
          toast.success("Account created! Let's set up your profile.");
          navigate("/onboarding");
        } else {
          toast.success("Welcome back!");
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid OTP");
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Card>
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
            >
              <CardTitle className="text-2xl font-bold">📊 Student Progress & Career Tracker</CardTitle>
            </motion.div>
            <CardDescription>
              {isLogin ? "Sign in to track your progress" : "Create an account to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="email" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="email" className="gap-1.5 text-sm">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" className="gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </TabsTrigger>
              </TabsList>

              {/* Email Tab */}
              <TabsContent value="email">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLogin && (
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                        required={!isLogin}
                      />
                    </motion.div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                  </div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
                    </Button>
                  </motion.div>
                </form>

                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
                  >
                    {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                  </button>
                </div>
              </TabsContent>

              {/* Phone OTP Tab */}
              <TabsContent value="phone">
                <div className="space-y-4">
                  {!otpSent ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <div className="flex gap-2">
                          <Select value={countryCode} onValueChange={setCountryCode}>
                            <SelectTrigger className="w-[130px] shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {COUNTRY_CODES.map((c) => (
                                <SelectItem key={c.code} value={c.code}>
                                  {c.country} ({c.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            id="phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                            placeholder="9876543210"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="button"
                          className="w-full"
                          onClick={handleSendOTP}
                          disabled={phoneLoading || !phone}
                        >
                          {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {phoneLoading ? "Sending..." : "Send OTP"}
                        </Button>
                      </motion.div>
                    </>
                  ) : (
                    <motion.div
                      className="space-y-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium">Enter OTP</p>
                        <p className="text-xs text-muted-foreground">
                          Sent to {phone}
                        </p>
                      </div>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="button"
                          className="w-full"
                          onClick={handleVerifyOTP}
                          disabled={phoneLoading || otp.length !== 6}
                        >
                          {phoneLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {phoneLoading ? "Verifying..." : "Verify & Sign In"}
                        </Button>
                      </motion.div>
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setOtp(""); }}
                        className="w-full text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline text-center"
                      >
                        Change phone number
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOTP}
                        disabled={phoneLoading}
                        className="w-full text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline text-center"
                      >
                        Resend OTP
                      </button>
                    </motion.div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-2"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  const { error } = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (error) {
                    toast.error(error.message || "Google sign-in failed");
                    setLoading(false);
                  }
                }}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;
