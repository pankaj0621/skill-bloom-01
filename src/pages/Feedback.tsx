import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Lightbulb, Bug, ChevronUp, Plus, MessageSquare, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { z } from "zod";

const feedbackSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().max(1000, "Description must be less than 1000 characters").optional(),
});

interface Feedback {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  admin_response: string | null;
  votes_count: number;
  created_at: string;
}

interface FeedbackVote {
  feedback_id: string;
  user_id: string;
}

const Feedback = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("feature_request");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch feedback
  const { data: feedbackList = [] } = useQuery({
    queryKey: ["feedback"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feedback")
        .select("*")
        .order("votes_count", { ascending: false });
      return (data || []) as Feedback[];
    },
  });

  // Fetch user votes
  const { data: userVotes = [] } = useQuery({
    queryKey: ["feedback-votes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("feedback_votes")
        .select("feedback_id, user_id")
        .eq("user_id", user.id);
      return (data || []) as FeedbackVote[];
    },
    enabled: !!user,
  });

  // Fetch profiles for display names
  const { data: profiles = [] } = useQuery({
    queryKey: ["feedback-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name, username, avatar_url");
      return data || [];
    },
  });

  const hasVoted = (feedbackId: string) => userVotes.some(v => v.feedback_id === feedbackId);

  const getProfile = (userId: string) => profiles.find(p => p.id === userId);

  // Submit feedback
  const submitMutation = useMutation({
    mutationFn: async (data: { type: string; title: string; description?: string }) => {
      const { error } = await supabase.from("feedback").insert({
        user_id: user!.id,
        type: data.type,
        title: data.title,
        description: data.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Feedback submitted!");
      setDialogOpen(false);
      setForm({ title: "", description: "" });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async ({ feedbackId, remove }: { feedbackId: string; remove: boolean }) => {
      if (remove) {
        const { error } = await supabase
          .from("feedback_votes")
          .delete()
          .eq("feedback_id", feedbackId)
          .eq("user_id", user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("feedback_votes")
          .insert({ feedback_id: feedbackId, user_id: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      queryClient.invalidateQueries({ queryKey: ["feedback-votes"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = () => {
    const result = feedbackSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(e => {
        if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    submitMutation.mutate({ type: activeTab, title: form.title, description: form.description });
  };

  const featureRequests = feedbackList.filter(f => f.type === "feature_request");
  const bugReports = feedbackList.filter(f => f.type === "bug_report");

  const statusIcon = (status: string) => {
    if (status === "in_progress") return <Clock className="h-3.5 w-3.5 text-amber-500" />;
    if (status === "completed" || status === "resolved") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    return null;
  };

  const statusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "secondary",
      in_progress: "default",
      completed: "default",
      resolved: "default",
      closed: "outline",
    };
    return <Badge variant={variants[status] || "secondary"} className="text-xs capitalize">{status.replace("_", " ")}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Feedback</h1>
            <p className="text-sm text-muted-foreground">Request features and report bugs</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Submit Feedback</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Feedback</DialogTitle>
                <DialogDescription>Share your ideas or report issues</DialogDescription>
              </DialogHeader>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="feature_request" className="gap-2"><Lightbulb className="h-4 w-4" /> Feature</TabsTrigger>
                  <TabsTrigger value="bug_report" className="gap-2"><Bug className="h-4 w-4" /> Bug</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Title *</Label>
                  <Input
                    placeholder={activeTab === "feature_request" ? "I'd like to see..." : "Issue with..."}
                    value={form.title}
                    onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                    maxLength={100}
                  />
                  {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Provide more details..."
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                    maxLength={1000}
                    className="min-h-[100px]"
                  />
                  {errors.description && <p className="text-xs text-destructive mt-1">{errors.description}</p>}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? "Submitting..." : "Submit"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="features" className="space-y-4">
          <TabsList>
            <TabsTrigger value="features" className="gap-2">
              <Lightbulb className="h-4 w-4" /> Features ({featureRequests.length})
            </TabsTrigger>
            <TabsTrigger value="bugs" className="gap-2">
              <Bug className="h-4 w-4" /> Bugs ({bugReports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="features" className="space-y-3">
            {featureRequests.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No feature requests yet. Be the first!</CardContent></Card>
            ) : (
              featureRequests.map(f => (
                <FeedbackCard key={f.id} feedback={f} profile={getProfile(f.user_id)} hasVoted={hasVoted(f.id)} onVote={(remove) => voteMutation.mutate({ feedbackId: f.id, remove })} statusIcon={statusIcon} statusBadge={statusBadge} />
              ))
            )}
          </TabsContent>

          <TabsContent value="bugs" className="space-y-3">
            {bugReports.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No bug reports. Everything working great!</CardContent></Card>
            ) : (
              bugReports.map(f => (
                <FeedbackCard key={f.id} feedback={f} profile={getProfile(f.user_id)} hasVoted={hasVoted(f.id)} onVote={(remove) => voteMutation.mutate({ feedbackId: f.id, remove })} statusIcon={statusIcon} statusBadge={statusBadge} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

const FeedbackCard = ({ feedback, profile, hasVoted, onVote, statusIcon, statusBadge }: {
  feedback: Feedback;
  profile: any;
  hasVoted: boolean;
  onVote: (remove: boolean) => void;
  statusIcon: (s: string) => React.ReactNode;
  statusBadge: (s: string) => React.ReactNode;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1">
          <Button
            variant={hasVoted ? "default" : "outline"}
            size="icon"
            className="h-10 w-10"
            onClick={() => onVote(hasVoted)}
          >
            <ChevronUp className="h-5 w-5" />
          </Button>
          <span className="text-sm font-bold">{feedback.votes_count}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-medium">{feedback.title}</h3>
            {statusBadge(feedback.status)}
            {statusIcon(feedback.status)}
          </div>
          {feedback.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{feedback.description}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Avatar className="h-5 w-5">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="text-[10px]">{(profile?.display_name || "U")[0]}</AvatarFallback>
            </Avatar>
            <span>{profile?.display_name || profile?.username || "Unknown"}</span>
            <span>•</span>
            <span>{format(new Date(feedback.created_at), "MMM dd, yyyy")}</span>
          </div>
          {feedback.admin_response && (
            <div className="mt-3 p-2 bg-muted rounded-md text-sm">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                <MessageSquare className="h-3 w-3" /> Admin Response
              </div>
              {feedback.admin_response}
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default Feedback;
