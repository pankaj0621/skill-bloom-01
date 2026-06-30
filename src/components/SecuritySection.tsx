import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Download, Trash2, ScrollText, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  event: string;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

const eventLabel: Record<string, string> = {
  account_export: "Data exported",
  account_delete: "Account deleted",
  profile_update: "Profile updated",
  password_change: "Password changed",
  login: "Signed in",
};

const SecuritySection = () => {
  const { user, signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { data: audit, isLoading } = useQuery({
    queryKey: ["audit_logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id,event,metadata,ip_address,created_at")
        .eq("target_user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
    enabled: !!user,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await supabase.functions.invoke("account-export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.error) throw res.error;
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `levelup-export-${user?.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Your data is downloading");
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await supabase.functions.invoke("account-delete", {
        headers: { Authorization: `Bearer ${token}` },
        body: { confirmation: confirmation.trim().toLowerCase() },
      });
      if (res.error) throw res.error;
      toast.success("Account deleted");
      setDeleteOpen(false);
      await signOut();
    } catch (e: any) {
      toast.error(e.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4 text-primary" /> Security & Data
        </CardTitle>
        <CardDescription>Manage your security, export, or delete your account.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Activity log */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Recent account activity</h4>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (audit?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="divide-y rounded-md border bg-card/50 max-h-56 overflow-auto">
              {audit!.map(a => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{eventLabel[a.event] || a.event}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
                      {a.ip_address && <span> · {a.ip_address}</span>}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{a.event}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        {/* Export */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-medium">Download your data</h4>
            <p className="text-xs text-muted-foreground">Get a JSON copy of your profile, progress, badges, and messages.</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting} className="gap-2 shrink-0">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export
          </Button>
        </div>

        <Separator />

        {/* Danger */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h4 className="text-sm font-medium text-destructive">Delete account</h4>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Permanently removes your profile, progress, messages, and badges. This cannot be undone.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="gap-2 shrink-0">
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setConfirmation(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Delete account permanently?
            </DialogTitle>
            <DialogDescription>
              This will remove all your data immediately. To confirm, type your <strong>username</strong> below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="confirm">Username</Label>
            <Input
              id="confirm"
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
              placeholder="your_username"
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || confirmation.trim().length < 3}
              className="gap-2"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              I understand, delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SecuritySection;
