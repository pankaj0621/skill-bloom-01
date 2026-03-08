import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Activity, Flag, TrendingUp, UserCheck, Zap, Calendar, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { toast } from "sonner";

const CHART_COLORS = [
  "hsl(217, 91%, 50%)",
  "hsl(152, 69%, 40%)",
  "hsl(0, 84%, 60%)",
  "hsl(45, 93%, 47%)",
  "hsl(280, 67%, 55%)",
];

const AdminDashboard = () => {
  const queryClient = useQueryClient();

  // Fetch all profiles for stats
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, xp, computed_level, current_streak, created_at, last_activity_date, role, stream, college, weekly_xp");
      return data || [];
    },
  });

  // Fetch reports
  const { data: reports = [] } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Fetch skill progress for analytics
  const { data: skillProgress = [] } = useQuery({
    queryKey: ["admin-skill-progress"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_skill_progress")
        .select("status, completed_at, created_at");
      return data || [];
    },
  });

  // Fetch activity feed (recent skill completions)
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

  // Update report mutation
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

  // Computed stats
  const totalUsers = profiles.length;
  const today = startOfDay(new Date());
  const activeToday = profiles.filter(p => p.last_activity_date && new Date(p.last_activity_date) >= today).length;
  const newThisWeek = profiles.filter(p => new Date(p.created_at) >= subDays(new Date(), 7)).length;
  const totalXP = profiles.reduce((sum, p) => sum + (p.xp || 0), 0);
  const avgXP = totalUsers > 0 ? Math.round(totalXP / totalUsers) : 0;
  const pendingReports = reports.filter(r => r.status === "pending").length;

  // Signup trend (last 14 days)
  const signupTrend = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(new Date(), 13 - i);
    const dayStr = format(day, "yyyy-MM-dd");
    const count = profiles.filter(p => format(new Date(p.created_at), "yyyy-MM-dd") === dayStr).length;
    return { date: format(day, "MMM dd"), signups: count };
  });

  // Level distribution
  const levelCounts: Record<string, number> = {};
  profiles.forEach(p => {
    const lvl = p.computed_level || "Beginner";
    levelCounts[lvl] = (levelCounts[lvl] || 0) + 1;
  });
  const levelData = Object.entries(levelCounts).map(([name, value]) => ({ name, value }));

  // XP distribution buckets
  const xpBuckets = [
    { range: "0-100", min: 0, max: 100 },
    { range: "101-500", min: 101, max: 500 },
    { range: "501-1000", min: 501, max: 1000 },
    { range: "1001-5000", min: 1001, max: 5000 },
    { range: "5000+", min: 5001, max: Infinity },
  ];
  const xpDistribution = xpBuckets.map(b => ({
    range: b.range,
    users: profiles.filter(p => (p.xp || 0) >= b.min && (p.xp || 0) <= b.max).length,
  }));

  // Stream distribution
  const streamCounts: Record<string, number> = {};
  profiles.forEach(p => {
    const s = p.stream || "Unset";
    streamCounts[s] = (streamCounts[s] || 0) + 1;
  });
  const streamData = Object.entries(streamCounts).map(([name, value]) => ({ name, value }));

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Platform overview and management</p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <StatCard icon={Users} label="Total Users" value={totalUsers} />
          <StatCard icon={UserCheck} label="Active Today" value={activeToday} />
          <StatCard icon={TrendingUp} label="New This Week" value={newThisWeek} />
          <StatCard icon={Zap} label="Avg XP" value={avgXP} />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reports" className="relative">
              Reports
              {pendingReports > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {pendingReports}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Signup Trend */}
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

              {/* Level Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Level Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={levelData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                        {levelData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* XP Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">XP Distribution</CardTitle>
                </CardHeader>
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

              {/* Stream Distribution */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Stream Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={streamData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                        {streamData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Users Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Top Users by XP</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="text-right">XP</TableHead>
                      <TableHead className="text-right">Streak</TableHead>
                      <TableHead className="hidden md:table-cell">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...profiles]
                      .sort((a, b) => (b.xp || 0) - (a.xp || 0))
                      .slice(0, 10)
                      .map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                <AvatarImage src={p.avatar_url || ""} />
                                <AvatarFallback className="text-xs">{(p.display_name || "U")[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium leading-none">{p.display_name || "Unknown"}</p>
                                {p.username && <p className="text-xs text-muted-foreground">@{p.username}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{p.computed_level}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{p.xp?.toLocaleString()}</TableCell>
                          <TableCell className="text-right">{p.current_streak}🔥</TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                            {format(new Date(p.created_at), "MMM dd, yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <ReportsSection reports={reports} profiles={profiles} updateReport={updateReport} />
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

// Stat Card
const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: number }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-2.5">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

// Reports Section
const ReportsSection = ({ reports, profiles, updateReport }: any) => {
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});

  const getReporterName = (id: string) => {
    const p = profiles.find((p: any) => p.id === id);
    return p?.display_name || p?.username || "Unknown";
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "pending": return "destructive";
      case "reviewing": return "secondary";
      case "resolved": return "default";
      default: return "outline";
    }
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
      {reports.map((report: any) => (
        <Card key={report.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusColor(report.status) as any}>{report.status}</Badge>
                  <Badge variant="outline">{report.report_type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(report.created_at), "MMM dd, yyyy HH:mm")}
                  </span>
                </div>
                <p className="font-medium mt-1.5">{report.reason}</p>
                {report.description && <p className="text-sm text-muted-foreground mt-1">{report.description}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Reported by: {getReporterName(report.reporter_id)}
                  {report.reported_user_id && ` → ${getReporterName(report.reported_user_id)}`}
                </p>
              </div>
            </div>

            {report.status !== "resolved" && (
              <div className="flex flex-col sm:flex-row gap-2">
                <Textarea
                  placeholder="Admin notes..."
                  value={adminNotes[report.id] || report.admin_notes || ""}
                  onChange={(e) => setAdminNotes(prev => ({ ...prev, [report.id]: e.target.value }))}
                  className="text-sm min-h-[60px]"
                />
                <div className="flex sm:flex-col gap-2 sm:min-w-[100px]">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => updateReport.mutate({ id: report.id, status: "reviewing", admin_notes: adminNotes[report.id] })}
                  >
                    Review
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => updateReport.mutate({ id: report.id, status: "resolved", admin_notes: adminNotes[report.id] })}
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            )}

            {report.status === "resolved" && report.admin_notes && (
              <p className="text-sm bg-muted p-2 rounded-md">
                <span className="font-medium">Admin Notes:</span> {report.admin_notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Activity Section
const ActivitySection = ({ profiles, recentActivity }: any) => {
  const getUserName = (id: string) => {
    const p = profiles.find((p: any) => p.id === id);
    return p?.display_name || p?.username || "Unknown";
  };

  const getUserAvatar = (id: string) => {
    const p = profiles.find((p: any) => p.id === id);
    return p?.avatar_url || "";
  };

  // Daily activity (last 7 days)
  const dailyActivity = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const dayStr = format(day, "yyyy-MM-dd");
    const count = recentActivity.filter((a: any) => format(new Date(a.created_at), "yyyy-MM-dd") === dayStr).length;
    return { date: format(day, "EEE"), actions: count };
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Daily Activity (Last 7 Days)
          </CardTitle>
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
            {recentActivity.slice(0, 20).map((activity: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={getUserAvatar(activity.user_id)} />
                  <AvatarFallback className="text-xs">{getUserName(activity.user_id)[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{getUserName(activity.user_id)}</span>
                  <span className="text-muted-foreground"> — {activity.status}</span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(activity.created_at), "MMM dd, HH:mm")}
                </span>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
