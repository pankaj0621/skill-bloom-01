import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AnimatedProgress from "@/components/AnimatedProgress";
import { getLevel, getLevelColor } from "@/lib/levels";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import { TrendingUp, Target, CheckCircle2, Clock, Flame, Calendar } from "lucide-react";
import { format, subDays, startOfWeek, eachDayOfInterval, parseISO, isWithinInterval } from "date-fns";

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(152, 69%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(262, 83%, 58%)",
  "hsl(0, 84%, 60%)",
];

const Analytics = () => {
  const { user } = useAuth();

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["analytics_progress", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_skill_progress")
        .select("*, skills(name, track_id, skill_tracks(name))")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["analytics_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("current_streak, longest_streak, created_at")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (progressLoading) {
    return (
      <Layout>
        <div className="space-y-6 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))}
          </div>
          <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
      </Layout>
    );
  }

  type ProgressItem = {
    status: string;
    completed_at?: string | null;
    skills?: { skill_tracks?: { name?: string } | null; track_id?: string } | null;
  };

  const allItems = (progress || []) as ProgressItem[];
  const total = allItems.length;
  const completed = allItems.filter((p) => p.status === "completed").length;
  const inProgress = allItems.filter((p) => p.status === "in_progress").length;
  const notStarted = total - completed - inProgress;
  const overallPct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const level = getLevel(completed, total);

  // Weekly completion data (last 8 weeks)
  const now = new Date();
  const weeklyData = Array.from({ length: 8 }).map((_, i) => {
    const weekEnd = subDays(now, i * 7);
    const weekStart = subDays(weekEnd, 6);
    const count = allItems.filter((p) => {
      if (p.status !== "completed" || !p.completed_at) return false;
      const d = parseISO(p.completed_at);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    }).length;
    return {
      week: format(weekStart, "MMM d"),
      completed: count,
    };
  }).reverse();

  // Daily completions (last 14 days)
  const days = eachDayOfInterval({ start: subDays(now, 13), end: now });
  const dailyData = days.map((day) => {
    const count = allItems.filter((p) => {
      if (p.status !== "completed" || !p.completed_at) return false;
      return format(parseISO(p.completed_at), "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
    }).length;
    return { day: format(day, "EEE"), date: format(day, "MMM d"), completed: count };
  });

  // Track breakdown
  const trackMap = allItems.reduce((acc: Record<string, { name: string; total: number; completed: number }>, p) => {
    const trackName = p.skills?.skill_tracks?.name || "Unknown";
    const trackId = p.skills?.track_id || "unknown";
    if (!acc[trackId]) acc[trackId] = { name: trackName, total: 0, completed: 0 };
    acc[trackId].total++;
    if (p.status === "completed") acc[trackId].completed++;
    return acc;
  }, {});
  const trackData = Object.values(trackMap).map((t) => ({
    name: t.name,
    completed: t.completed,
    remaining: t.total - t.completed,
    pct: t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
  }));

  // Pie data
  const pieData = [
    { name: "Completed", value: completed, color: "hsl(152, 69%, 40%)" },
    { name: "In Progress", value: inProgress, color: "hsl(var(--primary))" },
    { name: "Not Started", value: notStarted, color: "hsl(var(--muted-foreground) / 0.3)" },
  ].filter((d) => d.value > 0);

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl md:text-3xl font-bold">Progress Analytics 📊</h1>
          <p className="text-sm text-muted-foreground">Track your learning journey over time</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          className="grid gap-3 grid-cols-2 md:grid-cols-4"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{overallPct}%</p>
                  <p className="text-[11px] text-muted-foreground">Overall</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{completed}</p>
                  <p className="text-[11px] text-muted-foreground">Completed</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-orange-500/10">
                  <Flame className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{profile?.current_streak ?? 0}</p>
                  <p className="text-[11px] text-muted-foreground">Day Streak</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-full bg-violet-500/10">
                  <TrendingUp className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <Badge className={getLevelColor(level)}>{level}</Badge>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Level</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Overall Progress Bar */}
        <motion.div variants={itemVariants} initial="hidden" animate="show">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overall Completion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{completed} of {total} skills</span>
                <span className="font-semibold">{overallPct}%</span>
              </div>
              <AnimatedProgress value={overallPct} />
            </CardContent>
          </Card>
        </motion.div>

        {/* Charts Row */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* Weekly Completions */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Weekly Completions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="week" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Daily Activity */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Daily Activity (14 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ""}
                      />
                      <Area
                        type="monotone"
                        dataKey="completed"
                        stroke="hsl(152, 69%, 40%)"
                        fill="hsl(152, 69%, 40%)"
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Skill Distribution + Track Breakdown */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {/* Pie Chart */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Skill Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="hsl(var(--card))"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                  {pieData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[11px]">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Track Breakdown */}
          <motion.div variants={itemVariants} initial="hidden" animate="show">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Track Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trackData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No tracks yet</p>
                ) : (
                  trackData.map((track, i) => (
                    <div key={track.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium truncate">{track.name}</span>
                        <span className="text-muted-foreground text-xs">{track.pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                          initial={{ width: 0 }}
                          animate={{ width: `${track.pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1 }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
};

export default Analytics;
