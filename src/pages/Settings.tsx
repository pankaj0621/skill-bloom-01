import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { feedback } from "@/components/SuccessToast";
import { motion } from "framer-motion";
import ErrorAlert, { getQueryErrorProps } from "@/components/ErrorAlert";
import {
  Sun, Moon, Monitor, Bell, BellOff, Shield, UserCircle,
  Save, ArrowLeft, MessageCircle, Trophy, TrendingUp, Users,
  Eye, EyeOff, BarChart3, Flame, Pencil,
} from "lucide-react";

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const Settings = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Profile data
  const { data: profile, isLoading: profileLoading, error: profileError, refetch: refetchProfile } = useQuery({
    queryKey: ["settings_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, bio, college, stream, year, primary_goal, username")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Settings data
  const { data: settings, isLoading: settingsLoading, error: settingsError, refetch: refetchSettings } = useQuery({
    queryKey: ["user_settings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        const { data: created, error: createErr } = await supabase
          .from("user_settings")
          .insert({ user_id: user!.id })
          .select()
          .single();
        if (createErr) throw createErr;
        return created;
      }
      return data;
    },
    enabled: !!user,
  });

  // Profile form
  const [profileForm, setProfileForm] = useState({
    display_name: "",
    bio: "",
    college: "",
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        college: profile.college || "",
      });
    }
  }, [profile]);

  // Save profile
  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profileForm.display_name.trim() || null,
          bio: profileForm.bio.trim() || null,
          college: profileForm.college.trim() || null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings_profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      feedback.saved("Profile");
    },
    onError: () => feedback.error("Failed to update profile", {
      description: "Your changes couldn't be saved. Please try again.",
      retry: () => saveProfile.mutate(),
    }),
  });

  // Update setting
  const updateSetting = useMutation({
    mutationFn: async (updates: Record<string, boolean>) => {
      const { error } = await supabase
        .from("user_settings")
        .update(updates)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_settings"] });
      feedback.saved("Setting");
    },
    onError: (_, variables) => feedback.error("Failed to update setting", {
      description: "The setting couldn't be changed. Please try again.",
      retry: () => updateSetting.mutate(variables),
    }),
  });

  const toggleSetting = (key: string, value: boolean) => {
    updateSetting.mutate({ [key]: value });
  };

  const isLoading = profileLoading || settingsLoading;
  const hasError = profileError || settingsError;

  if (hasError && !isLoading) {
    return (
      <Layout>
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold">Settings ⚙️</h1>
          </div>
          <ErrorAlert
            {...getQueryErrorProps(profileError || settingsError)}
            onRetry={() => { refetchProfile(); refetchSettings(); }}
          />
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-6 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </Layout>
    );
  }

  type UserSettingsRow = typeof settings;
  const s = settings as NonNullable<UserSettingsRow>;

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Settings ⚙️</h1>
            <p className="text-sm text-muted-foreground">Manage your preferences</p>
          </div>
        </motion.div>

        {/* Theme */}
        <motion.div variants={itemVariants} initial="hidden" animate="show">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Appearance
              </CardTitle>
              <CardDescription>Choose your preferred theme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {[
                  { value: "light", icon: Sun, label: "Light" },
                  { value: "dark", icon: Moon, label: "Dark" },
                  { value: "system", icon: Monitor, label: "System" },
                ].map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    variant={theme === value ? "default" : "outline"}
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => setTheme(value)}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div variants={itemVariants} initial="hidden" animate="show">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </CardTitle>
              <CardDescription>Control what notifications you receive</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingToggle
                icon={Users}
                label="Friend Requests"
                description="Get notified when someone sends you a friend request"
                checked={s?.notify_friend_requests ?? true}
                onCheckedChange={(v) => toggleSetting("notify_friend_requests", v)}
              />
              <Separator />
              <SettingToggle
                icon={MessageCircle}
                label="Messages"
                description="Get notified for new messages from friends"
                checked={s?.notify_messages ?? true}
                onCheckedChange={(v) => toggleSetting("notify_messages", v)}
              />
              <Separator />
              <SettingToggle
                icon={Trophy}
                label="Badges & Achievements"
                description="Get notified when you earn badges"
                checked={s?.notify_badges ?? true}
                onCheckedChange={(v) => toggleSetting("notify_badges", v)}
              />
              <Separator />
              <SettingToggle
                icon={TrendingUp}
                label="Level Up"
                description="Get notified when you level up"
                checked={s?.notify_level_up ?? true}
                onCheckedChange={(v) => toggleSetting("notify_level_up", v)}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Privacy */}
        <motion.div variants={itemVariants} initial="hidden" animate="show">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy
              </CardTitle>
              <CardDescription>Control what others can see</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingToggle
                icon={Eye}
                label="Public Profile"
                description="Allow other users to view your profile"
                checked={s?.privacy_show_profile ?? true}
                onCheckedChange={(v) => toggleSetting("privacy_show_profile", v)}
              />
              <Separator />
              <SettingToggle
                icon={Flame}
                label="Show Streak"
                description="Display your daily streak on your profile"
                checked={s?.privacy_show_streak ?? true}
                onCheckedChange={(v) => toggleSetting("privacy_show_streak", v)}
              />
              <Separator />
              <SettingToggle
                icon={BarChart3}
                label="Show Progress"
                description="Display skill progress on your profile"
                checked={s?.privacy_show_progress ?? true}
                onCheckedChange={(v) => toggleSetting("privacy_show_progress", v)}
              />
              <Separator />
              <SettingToggle
                icon={Trophy}
                label="Show on Leaderboard"
                description="Appear in the public leaderboard rankings"
                checked={s?.privacy_show_on_leaderboard ?? true}
                onCheckedChange={(v) => toggleSetting("privacy_show_on_leaderboard", v)}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Profile Editing */}
        <motion.div variants={itemVariants} initial="hidden" animate="show">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Edit Profile
              </CardTitle>
              <CardDescription>Update your basic information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={profileForm.display_name}
                  onChange={(e) => setProfileForm({ ...profileForm, display_name: e.target.value })}
                  placeholder="Your name"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profileForm.bio}
                  onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                  placeholder="Tell others about yourself..."
                  maxLength={200}
                  rows={3}
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {profileForm.bio.length}/200
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="college">College</Label>
                <Input
                  id="college"
                  value={profileForm.college}
                  onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                  placeholder="Your college name"
                  maxLength={100}
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Pencil className="h-3 w-3" />
                <span>
                  Username: <strong>@{profile?.username || "not set"}</strong>
                  {" · "}Stream: <strong>{profile?.stream || "not set"}</strong>
                  {" — "}change these from your <button className="text-primary underline" onClick={() => navigate("/profile")}>Profile page</button>
                </span>
              </div>

              <Button
                onClick={() => saveProfile.mutate()}
                disabled={saveProfile.isPending}
                className="w-full gap-2"
              >
                <Save className="h-4 w-4" />
                {saveProfile.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </Layout>
  );
};

// Reusable toggle row
interface SettingToggleProps {
  icon: typeof Bell;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

const SettingToggle = ({ icon: Icon, label, description, checked, onCheckedChange }: SettingToggleProps) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-start gap-3">
      <div className="p-1.5 rounded-lg bg-muted mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

export default Settings;
