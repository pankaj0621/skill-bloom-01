import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Activity, Flag, TrendingUp, UserCheck, Zap, Calendar, Shield, UserX } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import UserManagement from "@/components/admin/UserManagement";
import FeedbackManagement from "@/components/admin/FeedbackManagement";

const CHART_COLORS = [
  "hsl(217, 91%, 50%)",
  "hsl(152, 69%, 40%)",
  "hsl(0, 84%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(280, 67%, 55%)",
];

const AdminDashboard = () => {
  const queryClient = useQueryClient();

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, xp, computed_level, current_streak, created_at, last_activity_date, role, stream, college, weekly_xp, bio, is_suspended, suspend_reason, suspended_until");
      return data || [];
    },
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: skillProgress = [] } = useQuery({
    queryKey: ["admin-skill-progress"],
    queryFn: async () => {
      const { data } = await supabase.from("user_skill_progress").select("status, completed_at, created_at");
      return data || [];
    },
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_skill_progress")
        .select("user_id, status, completed_at, created_at, skill_id")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const updateReport = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status: string; admin_notes?: string }) => {
      const { error } = await supabase
        .from("reports")
        .update({ status, admin_notes, resolved_at: status === "resolved" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Report updated");
    },
  });

  // Stats
  const totalUsers = profiles.length;
  const today = startOfDay(new Date());
  const activeToday = profiles.filter(p => p.last_activity_date && new Date(p.last_activity_date) >= today).length;
  const newThisWeek = profiles.filter(p => new Date(p.created_at) >= subDays(new Date(), 7)).length;
  const totalXP = profiles.reduce((sum, p) => sum + (p.xp || 0), 0);
  const avgXP = totalUsers > 0 ? Math.round(totalXP / totalUsers) : 0;
  const pendingReports = reports.filter(r => r.status === "pending").length;
  const suspendedCount = profiles.filter(p => p.is_suspended).length;

  // Signup trend
  const signupTrend = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(new Date(), 13 - i);
    const dayStr = format(day, "yyyy-MM-dd");
    const count = profiles.filter(p => format(new Date(p.created_at), "yyyy-MM-dd") === dayStr).length;
    return { date: format(day, "MMM dd"), signups: count };
  });

  // Level distribution
  const levelCounts: Record<string, number> = {};
  profiles.forEach(p => { const lvl = p.computed_level || "Beginner"; levelCounts[lvl] = (levelCounts[lvl] || 0) + 1; });
  const levelData = Object.entries(levelCounts).map(([name, value]) => ({ name, value }));

  // XP distribution
  const xpBuckets = [
    { range: "0-100", min: 0, max: 100 },
    { range: "101-500", min: 101, max: 500 },
    { range: "501-1K", min: 501, max: 1000 },
    { range: "1K-5K", min: 1001, max: 5000 },
    { range: "5K+", min: 5001, max: Infinity },
  ];
  const xpDistribution = xpBuckets.map(b => ({
    range: b.range,
    users: profiles.filter(p => (p.xp || 0) >= b.min && (p.xp || 0) <= b.max).length,
  }));

  // Stream distribution
  const streamCounts: Record<string, number> = {};
  profiles.forEach(p => { const s = p.stream || "Unset"; streamCounts[s] = (streamCounts[s] || 0) + 1; });
  const streamData = Object.entries(streamCounts).map(([name, value]) => ({ name, value }));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Full platform control & management</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard icon={Users} label="Total Users" value={totalUsers} />
          <StatCard icon={UserCheck} label="Active Today" value={activeToday} />
          <StatCard icon={TrendingUp} label="New This Week" value={newThisWeek} />
          <StatCard icon={Zap} label="Avg XP" value={avgXP} />
          <StatCard icon={UserX} label="Suspended" value={suspendedCount} variant="destructive" />
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports" className="relative">
              Reports
              {pendingReports > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {pendingReports}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <UserManagement profiles={profiles} />
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Signups (Last 14 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={signupTrend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" fontSize={11} className="fill-muted-foreground" />
                      <YAxis allowDecimals={false} fontSize={11} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Line type="monotone" dataKey="signups" stroke="hsl(217, 91%, 50%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Level Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={levelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                        {levelData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">XP Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={xpDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="range" fontSize={11} className="fill-muted-foreground" />
                      <YAxis allowDecimals={false} fontSize={11} className="fill-muted-foreground" />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="users" fill="hsl(152, 69%, 40%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Stream Distribution</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={streamData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                        {streamData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <ReportsSection reports={reports} profiles={profiles} updateReport={updateReport} />
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback" className="space-y-4">
            <FeedbackManagement profiles={profiles} />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <ActivitySection profiles={profiles} recentActivity={recentActivity} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};


interface AdminProfile {
  id: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
}

interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  type: string;
  reason: string;
  status: string;
  admin_notes?: string | null;
  created_at: string;
}

interface ActivityItem {
  user_id: string;
  status: string;
  created_at: string;
}

const StatCard = ({ icon: Icon, label, value, variant }: { icon: LucideIcon; label: string; value: number; variant?: string }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`rounded-lg p-2.5 ${variant === "destructive" ? "bg-destructive/10" : "bg-primary/10"}`}>
        <Icon className={`h-5 w-5 ${variant === "destructive" ? "text-destructive" : "text-primary"}`} />
      </div>
      <div>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const ReportsSection = ({ reports, profiles, updateReport }: { reports: Report[]; profiles: AdminProfile[]; updateReport: (id: string, updates: Record<string, string>) => void }) => {
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const getName = (id: string) => {
    const p = profiles.find((p) => p.id === id);
    return p?.display_name || p?.username || "Unknown";
  };
  const statusColor = (s: string) => {
    if (s === "pending") return "destructive";
    if (s === "reviewing") return "secondary";
    return "default";
  };

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Flag className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No reports yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusColor(r.status) as any}>{r.status}</Badge>
                  <Badge variant="outline">{r.report_type}</Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(r.created_at), "MMM dd, yyyy HH:mm")}</span>
                </div>
                <p className="font-medium mt-1.5">{r.reason}</p>
                {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Reported by: {getName(r.reporter_id)}
                  {r.reported_user_id && ` → ${getName(r.reported_user_id)}`}
                </p>
              </div>
            </div>
            {r.status !== "resolved" && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Textarea
                  placeholder="Admin notes..."
                  value={adminNotes[r.id] || r.admin_notes || ""}
                  onChange={(e) => setAdminNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                  className="text-sm min-h-[60px]"
                />
                <div className="flex sm:flex-col gap-2 sm:min-w-[100px]">
                  <Button size="sm" variant="secondary" className="flex-1" onClick={() => updateReport.mutate({ id: r.id, status: "reviewing", admin_notes: adminNotes[r.id] })}>Review</Button>
                  <Button size="sm" className="flex-1" onClick={() => updateReport.mutate({ id: r.id, status: "resolved", admin_notes: adminNotes[r.id] })}>Resolve</Button>
                </div>
              </div>
            )}
            {r.status === "resolved" && r.admin_notes && (
              <p className="text-sm bg-muted p-2 rounded-md"><span className="font-medium">Admin Notes:</span> {r.admin_notes}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const ActivitySection = ({ profiles, recentActivity }: { profiles: AdminProfile[]; recentActivity: ActivityItem[] }) => {
  const getName = (id: string) => {
    const p = profiles.find((p) => p.id === id);
    return p?.display_name || p?.username || "Unknown";
  };
  const getAvatar = (id: string) => {
    const p = profiles.find((p) => p.id === id);
    return p?.avatar_url || "";
  };
  const dailyActivity = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStr = format(day, "yyyy-MM-dd");
    const count = recentActivity.filter((a) => format(new Date(a.created_at), "yyyy-MM-dd") === dayStr).length;
    return { date: format(day, "EEE"), actions: count };
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /> Daily Activity (Last 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyActivity}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" fontSize={11} className="fill-muted-foreground" />
              <YAxis allowDecimals={false} fontSize={11} className="fill-muted-foreground" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="actions" fill="hsl(217, 91%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Latest skill progress updates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {recentActivity.slice(0, 20).map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={getAvatar(a.user_id)} />
                  <AvatarFallback className="text-xs">{getName(a.user_id)[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{getName(a.user_id)}</span>
                  <span className="text-muted-foreground"> — {a.status}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(a.created_at), "MMM dd, HH:mm")}</span>
              </div>
            ))}
            {recentActivity.length === 0 && <p className="text-center text-muted-foreground py-8">No recent activity</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
