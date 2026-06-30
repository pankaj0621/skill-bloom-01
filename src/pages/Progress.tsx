import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress as ProgressBar } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { CheckCircle, Clock, Circle, TrendingUp, Sparkles, HelpCircle, MessageSquare, Trash2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ProgressRow {
  id: string;
  status: string;
  completed_at: string | null;
  skills: {
    id: string;
    name: string;
    order?: number | null;
    difficulty_level?: string | null;
    skill_tracks?: { id: string; name: string } | null;
  } | null;
}

interface GuidanceRequest {
  id: string;
  user_id: string;
  skill_name: string;
  message: string;
  status: string;
  response: string | null;
  helper_id: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  completed: "hsl(var(--accent))",
  in_progress: "hsl(var(--primary))",
  not_started: "hsl(var(--muted-foreground))",
};

const ProgressPage = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [askOpen, setAskOpen] = useState(false);
  const [askSkill, setAskSkill] = useState("");
  const [askMessage, setAskMessage] = useState("");
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");

  const { data: progress, isLoading } = useQuery({
    queryKey: ["progress_page", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_skill_progress")
        .select("id,status,completed_at,skills(id,name,order,difficulty_level,skill_tracks(id,name))")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as unknown as ProgressRow[];
    },
    enabled: !!user,
  });

  const { data: guidance } = useQuery({
    queryKey: ["guidance_requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_guidance_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as GuidanceRequest[];
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("user_skill_progress")
        .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress_page"] });
      qc.invalidateQueries({ queryKey: ["user_progress_full"] });
      toast.success("Progress updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createGuidance = useMutation({
    mutationFn: async () => {
      if (!askSkill.trim() || !askMessage.trim()) throw new Error("Skill and message required");
      const { error } = await supabase.from("peer_guidance_requests").insert({
        user_id: user!.id,
        skill_name: askSkill.trim(),
        message: askMessage.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guidance_requests"] });
      setAskOpen(false);
      setAskSkill("");
      setAskMessage("");
      toast.success("Guidance request posted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const respondGuidance = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const { error } = await supabase
        .from("peer_guidance_requests")
        .update({ response, status: "answered", helper_id: user!.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guidance_requests"] });
      setRespondingId(null);
      setResponseText("");
      toast.success("Response sent");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteGuidance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("peer_guidance_requests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guidance_requests"] });
      toast.success("Removed");
    },
  });

  const stats = useMemo(() => {
    const rows = progress || [];
    const total = rows.length || 1;
    const completed = rows.filter(r => r.status === "completed").length;
    const inProgress = rows.filter(r => r.status === "in_progress").length;
    const notStarted = rows.filter(r => r.status === "not_started" || !r.status).length;
    return {
      total: rows.length,
      completed, inProgress, notStarted,
      percent: Math.round((completed / total) * 100),
      pie: [
        { name: "Completed", value: completed, key: "completed" },
        { name: "In Progress", value: inProgress, key: "in_progress" },
        { name: "Not Started", value: notStarted, key: "not_started" },
      ].filter(d => d.value > 0),
    };
  }, [progress]);

  const trackChart = useMemo(() => {
    const map = new Map<string, { name: string; completed: number; in_progress: number; not_started: number }>();
    (progress || []).forEach(r => {
      const tn = r.skills?.skill_tracks?.name || "Other";
      const entry = map.get(tn) || { name: tn, completed: 0, in_progress: 0, not_started: 0 };
      if (r.status === "completed") entry.completed++;
      else if (r.status === "in_progress") entry.in_progress++;
      else entry.not_started++;
      map.set(tn, entry);
    });
    return Array.from(map.values());
  }, [progress]);

  const recommendations = useMemo(() => {
    const rows = progress || [];
    const inProg = rows.filter(r => r.status === "in_progress").slice(0, 3);
    const next = rows
      .filter(r => r.status !== "completed" && r.status !== "in_progress")
      .sort((a, b) => (a.skills?.order ?? 999) - (b.skills?.order ?? 999))
      .slice(0, 5 - inProg.length);
    return [...inProg, ...next];
  }, [progress]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight">Skills Progress</h1>
            <p className="text-muted-foreground text-sm mt-1">Track, update and get peer help on your journey.</p>
          </div>
          <Button onClick={() => setAskOpen(true)} size="sm" className="gap-2">
            <HelpCircle className="h-4 w-4" /> Ask for guidance
          </Button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Overall", value: `${stats.percent}%`, icon: TrendingUp, color: "text-primary" },
            { label: "Completed", value: stats.completed, icon: CheckCircle, color: "text-accent" },
            { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-primary" },
            { label: "Not Started", value: stats.notStarted, icon: Circle, color: "text-muted-foreground" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                  <div className="text-xl font-semibold">{s.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Overall progress bar */}
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total completion</span>
              <span className="font-medium">{stats.completed} / {stats.total}</span>
            </div>
            <ProgressBar value={stats.percent} />
          </CardContent>
        </Card>

        <Tabs defaultValue="charts">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="next">Next Steps</TabsTrigger>
            <TabsTrigger value="peers">Peer Help</TabsTrigger>
          </TabsList>

          {/* CHARTS */}
          <TabsContent value="charts" className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-72 w-full" />
            ) : stats.total === 0 ? (
              <EmptyState title="No data yet" description="Add skills from the Roadmap to see charts." />
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Status breakdown</CardTitle></CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={stats.pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                          {stats.pie.map(d => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">By track</CardTitle></CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer>
                      <BarChart data={trackChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                        <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                        <Legend />
                        <Bar dataKey="completed" stackId="a" fill={STATUS_COLORS.completed} />
                        <Bar dataKey="in_progress" stackId="a" fill={STATUS_COLORS.in_progress} />
                        <Bar dataKey="not_started" stackId="a" fill={STATUS_COLORS.not_started} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* NEXT STEPS */}
          <TabsContent value="next" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Recommended next steps</CardTitle>
                <CardDescription>Based on your in-progress and upcoming skills.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : recommendations.length === 0 ? (
                  <EmptyState title="All caught up!" description="No pending skills. Add new ones from the Roadmap." />
                ) : (
                  recommendations.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50 hover:bg-accent/5 transition">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{r.skills?.name}</div>
                        <div className="text-xs text-muted-foreground flex gap-2 items-center">
                          {r.skills?.skill_tracks?.name && <span>{r.skills.skill_tracks.name}</span>}
                          {r.skills?.difficulty_level && <Badge variant="outline" className="h-4 text-[10px]">{r.skills.difficulty_level}</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {r.status !== "in_progress" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: r.id, status: "in_progress" })}>
                            Start
                          </Button>
                        )}
                        <Button size="sm" onClick={() => updateStatus.mutate({ id: r.id, status: "completed" })}>
                          Done
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <Link to="/roadmap" className="block">
                  <Button variant="ghost" className="w-full gap-2">
                    See full roadmap <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PEER GUIDANCE */}
          <TabsContent value="peers" className="space-y-3">
            {(guidance || []).length === 0 ? (
              <EmptyState
                title="No guidance requests yet"
                description="Be the first to ask the community for help."
                action={<Button onClick={() => setAskOpen(true)}>Ask for guidance</Button>}
              />
            ) : (
              guidance!.map(g => {
                const mine = g.user_id === user?.id;
                return (
                  <Card key={g.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{g.skill_name}</div>
                          <div className="text-xs text-muted-foreground">{new Date(g.created_at).toLocaleString()}</div>
                        </div>
                        <Badge variant={g.status === "answered" ? "default" : "outline"}>{g.status}</Badge>
                      </div>
                      <p className="text-sm">{g.message}</p>
                      {g.response && (
                        <div className="rounded-md border-l-2 border-accent bg-accent/5 p-2 text-sm">
                          <div className="text-xs text-accent font-medium mb-1">Peer response</div>
                          {g.response}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        {!mine && g.status === "open" && (
                          respondingId === g.id ? (
                            <div className="flex-1 space-y-2">
                              <Textarea
                                value={responseText}
                                onChange={e => setResponseText(e.target.value)}
                                placeholder="Share your guidance..."
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => respondGuidance.mutate({ id: g.id, response: responseText })} disabled={!responseText.trim()}>
                                  Send
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setRespondingId(null); setResponseText(""); }}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setRespondingId(g.id)}>
                              <MessageSquare className="h-3.5 w-3.5" /> Respond
                            </Button>
                          )
                        )}
                        {mine && (
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteGuidance.mutate(g.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ask peers for guidance</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Skill</label>
              <input
                value={askSkill}
                onChange={e => setAskSkill(e.target.value)}
                placeholder="e.g. React hooks"
                className="w-full mt-1 px-3 py-2 rounded-md border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">What do you need help with?</label>
              <Textarea
                value={askMessage}
                onChange={e => setAskMessage(e.target.value)}
                placeholder="Describe your question..."
                rows={4}
                maxLength={1000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAskOpen(false)}>Cancel</Button>
            <Button onClick={() => createGuidance.mutate()} disabled={createGuidance.isPending}>
              Post request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ProgressPage;
