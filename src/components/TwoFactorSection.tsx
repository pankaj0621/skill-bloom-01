import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ShieldCheck, ShieldAlert, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface Factor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

interface EnrollData {
  factorId: string;
  secret: string;
  qr: string;
  uri: string;
}

const TwoFactorSection = () => {
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enroll, setEnroll] = useState<EnrollData | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const verified = factors.find((f) => f.factor_type === "totp" && f.status === "verified");

  const loadFactors = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      setFactors((data?.all || []) as Factor[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load 2FA status";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFactors(); }, []);

  const startEnroll = async () => {
    setSubmitting(true);
    try {
      // Clean up any stale unverified TOTP factors first
      const { data: list } = await supabase.auth.mfa.listFactors();
      const stale = (list?.all || []).filter(
        (f) => f.factor_type === "totp" && f.status !== "verified"
      );
      for (const f of stale) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toLocaleDateString()}`,
      });
      if (error) throw error;
      setEnroll({
        factorId: data.id,
        secret: data.totp.secret,
        qr: data.totp.qr_code,
        uri: data.totp.uri,
      });
      setEnrollOpen(true);
      setCode("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not start 2FA enrollment";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const verifyEnroll = async () => {
    if (!enroll || code.length !== 6) return;
    setSubmitting(true);
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({
        factorId: enroll.factorId,
      });
      if (cErr) throw cErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) throw vErr;
      toast.success("Two-factor authentication enabled");
      setEnrollOpen(false);
      setEnroll(null);
      setCode("");
      await loadFactors();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Invalid code";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEnroll = async () => {
    if (enroll) {
      try { await supabase.auth.mfa.unenroll({ factorId: enroll.factorId }); } catch { /* ignore */ }
    }
    setEnrollOpen(false);
    setEnroll(null);
    setCode("");
  };

  const disable2FA = async () => {
    if (!verified) return;
    if (!window.confirm("Disable two-factor authentication? Your account will be less secure.")) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
      if (error) throw error;
      toast.success("2FA disabled");
      await loadFactors();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not disable 2FA";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const copySecret = async () => {
    if (!enroll) return;
    await navigator.clipboard.writeText(enroll.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {verified ? (
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          )}
          Two-factor authentication
          {verified && <Badge variant="secondary" className="ml-1 text-[10px]">Enabled</Badge>}
        </CardTitle>
        <CardDescription>
          Add an authenticator app (Google Authenticator, 1Password, Authy) for a second sign-in step.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : verified ? (
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{verified.friendly_name || "Authenticator app"}</p>
              <p className="text-[11px] text-muted-foreground">
                Added {new Date(verified.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={disable2FA} disabled={submitting} className="shrink-0">
              {submitting && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
              Disable
            </Button>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Not enabled. Sign-in only requires your password.
            </p>
            <Button size="sm" onClick={startEnroll} disabled={submitting} className="shrink-0">
              {submitting && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
              Enable 2FA
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={enrollOpen} onOpenChange={(o) => { if (!o) cancelEnroll(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set up authenticator</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app, then enter the 6-digit code it shows.
            </DialogDescription>
          </DialogHeader>
          {enroll && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div
                  className="rounded-md border bg-white p-3"
                  // QR is an SVG string from Supabase
                  dangerouslySetInnerHTML={{ __html: enroll.qr }}
                />
              </div>
              <Separator />
              <div>
                <Label className="text-xs">Can't scan? Enter this key manually</Label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 break-all rounded-md border bg-muted/50 px-2 py-1.5 text-xs font-mono">
                    {enroll.secret}
                  </code>
                  <Button size="sm" variant="outline" onClick={copySecret} className="shrink-0">
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="totp-code">6-digit code</Label>
                <Input
                  id="totp-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className="mt-1 font-mono tracking-widest text-center text-lg"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={cancelEnroll}>Cancel</Button>
            <Button onClick={verifyEnroll} disabled={submitting || code.length !== 6} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify & enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TwoFactorSection;
