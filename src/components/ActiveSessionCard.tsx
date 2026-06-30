import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, LogOut, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";

const parseDevice = (ua: string) => {
  if (/iPhone|iPad|iPod/i.test(ua)) return { label: "iOS device", icon: Smartphone };
  if (/Android/i.test(ua)) return { label: "Android device", icon: Smartphone };
  if (/Mac OS X/i.test(ua)) return { label: "Mac", icon: Monitor };
  if (/Windows/i.test(ua)) return { label: "Windows", icon: Monitor };
  if (/Linux/i.test(ua)) return { label: "Linux", icon: Monitor };
  return { label: "Unknown device", icon: Monitor };
};

const parseBrowser = (ua: string) => {
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return "Safari";
  return "Browser";
};

const ActiveSessionCard = () => {
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setLastSignIn(data.user?.last_sign_in_at ?? null);
    });
  }, []);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const device = parseDevice(ua);
  const browser = parseBrowser(ua);
  const DeviceIcon = device.icon;

  const handleSignOutOthers = async () => {
    setSigningOut(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
      toast.success("Signed out from all other devices");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not sign out other sessions";
      toast.error(msg);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Monitor className="h-4 w-4 text-primary" /> Active session
        </CardTitle>
        <CardDescription>This device, and a way to sign out everywhere else.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border bg-card/50 p-3">
          <div className="rounded-md bg-primary/10 p-2">
            <DeviceIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium">{device.label} · {browser}</p>
              <Badge variant="secondary" className="text-[10px]">This device</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {lastSignIn ? `Last sign-in ${new Date(lastSignIn).toLocaleString()}` : "Currently signed in"}
            </p>
            {user?.email && <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>}
          </div>
        </div>

        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium">Sign out other devices</h4>
            <p className="text-xs text-muted-foreground">
              Revokes all sessions except this one. Useful if you suspect unauthorized access.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 shrink-0"
            onClick={handleSignOutOthers}
            disabled={signingOut}
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sign out others
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActiveSessionCard;
