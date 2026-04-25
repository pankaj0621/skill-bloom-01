import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MessageSquare, Trash2, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface FeedbackItem {
  id: string;
  user_id: string;
  type: string;
  status: string;
  title: string;
  description?: string | null;
  admin_response?: string | null;
  votes_count: number;
  created_at: string;
}

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface FeedbackManagementProps {
  profiles: Profile[];
}

const FeedbackManagement = ({ profiles }: FeedbackManagementProps) => {
  const queryClient = useQueryClient();
  const [respondDialog, setRespondDialog] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: feedbackList = [] } = useQuery({
    queryKey: ["admin-feedback"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feedback")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => {
      const { error } = await supabase.from("feedback").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Feedback updated");
      setRespondDialog(null);
      setResponse("");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feedback"] });
      toast.success("Feedback deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const getProfile = (id: string) => profiles.find(p => p.id === id);

  const filtered = (feedbackList as FeedbackItem[]).filter((f) => {
    if (filterType !== "all" && f.type !== filterType) return false;
    if (filterStatus !== "all" && f.status !== filterStatus) return false;
    return true;
  });

  const openRespond = (f: FeedbackItem) => {
    setRespondDialog(f.id);
    setResponse(f.admin_response || "");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="feature_request">Features</SelectItem>
            <SelectItem value="bug_report">Bugs</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Feedback ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filtered.map((f) => {
              const profile = getProfile(f.user_id);
              return (
                <div key={f.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={f.type === "bug_report" ? "destructive" : "default"} className="text-xs">
                          {f.type === "bug_report" ? "Bug" : "Feature"}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">{f.status.replace("_", " ")}</Badge>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ChevronUp className="h-3 w-3" /> {f.votes_count}
                        </span>
                      </div>
                      <h3 className="font-medium mt-1">{f.title}</h3>
                      {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Avatar className="h-4 w-4">
                          <AvatarImage src={profile?.avatar_url || ""} />
                          <AvatarFallback className="text-[8px]">{(profile?.display_name || "U")[0]}</AvatarFallback>
                        </Avatar>
                        <span>{profile?.display_name || "Unknown"}</span>
                        <span>•</span>
                        <span>{format(new Date(f.created_at), "MMM dd, yyyy")}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Select
                        value={f.status}
                        onValueChange={(status) => updateMutation.mutate({ id: f.id, updates: { status } })}
                      >
                        <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openRespond(f)}>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(f.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  {f.admin_response && (
                    <div className="bg-muted rounded-md p-2 text-sm">
                      <span className="text-xs font-medium text-muted-foreground">Admin Response: </span>
                      {f.admin_response}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No feedback found</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!respondDialog} onOpenChange={() => setRespondDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin Response</DialogTitle>
          </DialogHeader>
          <div>
            <Label>Response</Label>
            <Textarea value={response} onChange={(e) => setResponse(e.target.value)} placeholder="Write your response..." className="min-h-[100px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondDialog(null)}>Cancel</Button>
            <Button onClick={() => respondDialog && updateMutation.mutate({ id: respondDialog, updates: { admin_response: response } })} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Response"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackManagement;
