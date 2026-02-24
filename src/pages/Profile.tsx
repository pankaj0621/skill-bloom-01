import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { getLevel, getLevelColor } from "@/lib/levels";
import { User, Plus, X, BookOpen, Camera, Loader2, Trash2, Check, Pencil } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import PinchZoomPreview from "@/components/PinchZoomPreview";

const STREAM_LABELS: Record<string, string> = { btech: "BTech", ba: "BA", bcom: "BCom", bsc: "BSc", other: "Other" };
const GOAL_LABELS: Record<string, string> = { job: "Job", higher_studies: "Higher Studies", competitive_exams: "Competitive Exams", skill_career: "Skill-based Career" };

const Profile = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [managingTracks, setManagingTracks] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ display_name: "", bio: "", year: "", college: "", stream: "", primary_goal: "" });
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  // Username change state
  const [usernameDialogOpen, setUsernameDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);


  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const getCroppedBlob = (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 512;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(
          img,
          pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
          0, 0, size, size
        );
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
          "image/webp",
          0.85
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageSrc;
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    const url = URL.createObjectURL(file);
    setCropImage(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCropDialogOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropConfirm = async () => {
    if (!cropImage || !croppedAreaPixels || !user) return;
    setUploadingAvatar(true);
    try {
      const blob = await getCroppedBlob(cropImage, croppedAreaPixels);
      const path = `${user.id}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/webp" });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile picture updated!");
      setCropDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
      if (cropImage) URL.revokeObjectURL(cropImage);
      setCropImage(null);
    }
  };

  const [removingAvatar, setRemovingAvatar] = useState(false);
  const handleRemoveAvatar = async () => {
    if (!user) return;
    setRemovingAvatar(true);
    try {
      await supabase.storage.from("avatars").remove([`${user.id}/avatar.webp`]);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile picture removed.");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove avatar.");
    } finally {
      setRemovingAvatar(false);
    }
  };

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      setForm({
        display_name: data.display_name || "",
        bio: data.bio || "",
        year: data.year?.toString() || "",
        college: data.college || "",
        stream: data.stream || "",
        primary_goal: data.primary_goal || "",
      });
      return data;
    },
    enabled: !!user,
  });
  const checkUsername = useCallback(async (value: string) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setNewUsername(clean);
    if (clean.length < 3) {
      setUsernameStatus(clean.length > 0 ? "invalid" : "idle");
      return;
    }
    if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
      setUsernameStatus("invalid");
      return;
    }
    if (clean === (profile as any)?.username) {
      setUsernameStatus("idle");
      return;
    }
    setUsernameStatus("checking");
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", clean)
        .maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 400);
  }, [profile]);

  const saveUsername = useMutation({
    mutationFn: async () => {
      if (usernameStatus !== "available") throw new Error("Username not available");
      const { error } = await supabase
        .from("profiles")
        .update({ username: newUsername, username_changes: ((profile as any)?.username_changes || 0) + 1 })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setUsernameDialogOpen(false);
      toast.success("Username updated!");
    },
    onError: (e: any) => toast.error(e.message || "Failed to update username"),
  });

  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ["user_progress", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_skill_progress")
        .select("*, skills(skill_tracks(id, name))")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // All available tracks for the user's stream
  const userStream = (profile as any)?.stream || "";
  const { data: availableTracks } = useQuery({
    queryKey: ["available_tracks", userStream],
    queryFn: async () => {
      const query = supabase.from("skill_tracks").select("*").eq("is_default", true);
      if (userStream) query.eq("stream", userStream);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!userStream,
  });

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: form.display_name,
          bio: form.bio,
          year: form.year ? parseInt(form.year) : null,
          college: form.college,
          stream: form.stream || null,
          primary_goal: form.primary_goal || null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["available_tracks"] });
      setEditing(false);
      toast.success("Profile updated! Recommendations will refresh.");
    },
  });

  // Add a track: insert progress rows for all its skills
  const addTrack = useMutation({
    mutationFn: async (trackId: string) => {
      const { data: skills, error: skillsError } = await supabase
        .from("skills")
        .select("id")
        .eq("track_id", trackId);
      if (skillsError) throw skillsError;
      if (skills && skills.length > 0) {
        const rows = skills.map((s) => ({ user_id: user!.id, skill_id: s.id, status: "not_started" as const }));
        const { error } = await supabase.from("user_skill_progress").upsert(rows, { onConflict: "user_id,skill_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_progress"] });
      queryClient.invalidateQueries({ queryKey: ["user_progress_full"] });
      toast.success("Track added!");
    },
  });

  // Remove a track: delete progress rows for its skills
  const removeTrack = useMutation({
    mutationFn: async (trackId: string) => {
      const { data: skills, error: skillsError } = await supabase
        .from("skills")
        .select("id")
        .eq("track_id", trackId);
      if (skillsError) throw skillsError;
      if (skills && skills.length > 0) {
        const skillIds = skills.map((s) => s.id);
        const { error } = await supabase
          .from("user_skill_progress")
          .delete()
          .eq("user_id", user!.id)
          .in("skill_id", skillIds);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_progress"] });
      queryClient.invalidateQueries({ queryKey: ["user_progress_full"] });
      toast.success("Track removed.");
    },
  });

  // Derive track stats and active track IDs
  const trackStats = progress
    ? Object.values(
        progress.reduce((acc: Record<string, { id: string; name: string; total: number; completed: number }>, p: any) => {
          const trackId = p.skills?.skill_tracks?.id || "unknown";
          const name = p.skills?.skill_tracks?.name || "Unknown";
          if (!acc[trackId]) acc[trackId] = { id: trackId, name, total: 0, completed: 0 };
          acc[trackId].total++;
          if (p.status === "completed") acc[trackId].completed++;
          return acc;
        }, {})
      )
    : [];

  const activeTrackIds = new Set(trackStats.map((t) => t.id));
  const inactiveTracks = availableTracks?.filter((t) => !activeTrackIds.has(t.id)) || [];

  if (profileLoading || progressLoading) {
    return (
      <Layout>
        <div className="space-y-6 max-w-2xl">
          <Skeleton className="h-9 w-32" />
          <Card>
            <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <motion.h1
          className="text-2xl sm:text-3xl font-bold"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          Profile
        </motion.h1>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <motion.div
                  className="relative"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                >
                  <button
                    type="button"
                    className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ring-offset-2 ring-offset-background cursor-pointer select-none"
                    onPointerDown={() => {
                      didLongPress.current = false;
                      longPressTimer.current = setTimeout(() => {
                        didLongPress.current = true;
                        setAvatarMenuOpen(true);
                      }, 500);
                    }}
                    onPointerUp={() => {
                      if (longPressTimer.current) clearTimeout(longPressTimer.current);
                      if (!didLongPress.current && profile?.avatar_url) {
                        setAvatarPreviewOpen(true);
                      } else if (!didLongPress.current && !profile?.avatar_url) {
                        setAvatarMenuOpen(true);
                      }
                    }}
                    onPointerLeave={() => {
                      if (longPressTimer.current) clearTimeout(longPressTimer.current);
                    }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <Avatar className="h-16 w-16 ring-2 ring-primary/20 hover:ring-primary/50 transition-all">
                      {profile?.avatar_url ? (
                        <AvatarImage src={profile.avatar_url} alt={profile.display_name || "Avatar"} />
                      ) : null}
                      <AvatarFallback className="bg-muted">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </motion.div>
                <div>
                  <CardTitle>{profile?.display_name || "Student"}</CardTitle>
                  {(profile as any)?.username && (
                    <p className="text-sm text-muted-foreground">@{(profile as any).username}</p>
                  )}
                  <p className="text-xs text-muted-foreground capitalize">{profile?.role || "No role set"}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {editing ? (
                  <motion.div
                    key="edit"
                    className="space-y-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="space-y-2">
                      <Label>Username</Label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                          <Input
                            value={(profile as any)?.username || "Not set"}
                            disabled
                            className="pl-8 opacity-60"
                          />
                        </div>
                        {((profile as any)?.username_changes ?? 0) < 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1 flex-shrink-0"
                            onClick={() => {
                              setNewUsername((profile as any)?.username || "");
                              setUsernameStatus("idle");
                              setUsernameDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                            Change
                          </Button>
                        )}
                      </div>
                      {((profile as any)?.username_changes ?? 0) >= 1 ? (
                        <p className="text-[11px] text-muted-foreground">Username has already been changed once (limit reached)</p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground">You can change your username once</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Display Name</Label>
                      <Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Bio</Label>
                      <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Year</Label>
                        <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="e.g. 3" />
                      </div>
                      <div className="space-y-2">
                        <Label>College</Label>
                        <Input value={form.college} onChange={(e) => setForm({ ...form, college: e.target.value })} placeholder="Your college" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Stream</Label>
                        <select
                          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                          value={form.stream}
                          onChange={(e) => setForm({ ...form, stream: e.target.value })}
                        >
                          <option value="">Select stream</option>
                          <option value="btech">BTech</option>
                          <option value="ba">BA</option>
                          <option value="bcom">BCom</option>
                          <option value="bsc">BSc</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>Primary Goal</Label>
                        <select
                          className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base sm:text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                          value={form.primary_goal}
                          onChange={(e) => setForm({ ...form, primary_goal: e.target.value })}
                        >
                          <option value="">Select goal</option>
                          <option value="job">Job</option>
                          <option value="higher_studies">Higher Studies</option>
                          <option value="competitive_exams">Competitive Exams</option>
                          <option value="skill_career">Skill-based Career</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">💡 Changing stream or goal will update your Dashboard recommendations.</p>
                    <div className="flex gap-2">
                      <Button onClick={() => updateProfile.mutate()}>Save</Button>
                      <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view"
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {profile?.bio && <p className="text-sm">{profile.bio}</p>}
                    {profile?.college && <p className="text-sm text-muted-foreground">🎓 {profile.college}</p>}
                    {profile?.year && <p className="text-sm text-muted-foreground">Year {profile.year}</p>}
                    {(profile as any)?.stream && (
                      <p className="text-sm text-muted-foreground">📚 {STREAM_LABELS[(profile as any).stream] || (profile as any).stream}</p>
                    )}
                    {(profile as any)?.primary_goal && (
                      <p className="text-sm text-muted-foreground">🎯 {GOAL_LABELS[(profile as any).primary_goal] || (profile as any).primary_goal}</p>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit Profile</Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Skill Tracks Management */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Skill Tracks</CardTitle>
              {!managingTracks && (
                <Button variant="outline" size="sm" onClick={() => setManagingTracks(true)}>
                  Manage Tracks
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <AnimatePresence mode="wait">
                {managingTracks ? (
                  <motion.div
                    key="manage"
                    className="space-y-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {/* Active tracks */}
                    {trackStats.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active Tracks</Label>
                        {trackStats.map((track, i) => {
                          const lvl = getLevel(track.completed, track.total);
                          return (
                            <motion.div
                              key={track.id}
                              className="flex items-center justify-between rounded-lg border p-3"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: i * 0.05 }}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{track.name}</span>
                                <Badge variant="outline" className={getLevelColor(lvl)}>{lvl}</Badge>
                                <span className="text-xs text-muted-foreground">{track.completed}/{track.total}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                onClick={() => {
                                  if (track.completed > 0) {
                                    toast.error(`Can't remove "${track.name}" — you have ${track.completed} completed skill(s). Reset progress first if needed.`);
                                  } else {
                                    removeTrack.mutate(track.id);
                                  }
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}

                    {/* Available tracks to add */}
                    {inactiveTracks.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Add Tracks</Label>
                        {inactiveTracks.map((track, i) => (
                          <motion.div
                            key={track.id}
                            className="flex items-center justify-between rounded-lg border border-dashed p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.05 }}
                            onClick={() => addTrack.mutate(track.id)}
                          >
                            <div>
                              <span className="font-medium">{track.name}</span>
                              {track.description && <p className="text-xs text-muted-foreground">{track.description}</p>}
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-primary">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {!userStream && (
                      <p className="text-sm text-muted-foreground text-center py-2">Set your stream in the profile to see available tracks.</p>
                    )}

                    <p className="text-xs text-muted-foreground">💡 Adding or removing tracks will update your Roadmap and Dashboard recommendations.</p>
                    <Button variant="outline" size="sm" onClick={() => setManagingTracks(false)}>Done</Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="view"
                    className="space-y-2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25 }}
                  >
                    {trackStats.length > 0 ? (
                      trackStats.map((track, i) => {
                        const lvl = getLevel(track.completed, track.total);
                        return (
                          <motion.div
                            key={track.id}
                            className="flex items-center justify-between"
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: i * 0.08 }}
                          >
                            <span className="font-medium">{track.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">{track.completed}/{track.total}</span>
                              <Badge className={getLevelColor(lvl)}>{lvl}</Badge>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <EmptyState
                        icon={BookOpen}
                        title="No tracks selected"
                        description="Add skill tracks from your stream to start tracking progress."
                        actionLabel="Browse Tracks"
                        onAction={() => setManagingTracks(true)}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Crop Dialog */}
      <Dialog open={cropDialogOpen} onOpenChange={(open) => {
        if (!open && cropImage) {
          URL.revokeObjectURL(cropImage);
          setCropImage(null);
        }
        setCropDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
            {cropImage && (
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="text-xs text-muted-foreground">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary h-2"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCropDialogOpen(false)} disabled={uploadingAvatar}>
              Cancel
            </Button>
            <Button onClick={handleCropConfirm} disabled={uploadingAvatar}>
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Avatar Preview with pinch-to-zoom */}
      <AnimatePresence>
        {avatarPreviewOpen && profile?.avatar_url && (
          <PinchZoomPreview
            src={profile.avatar_url}
            alt={profile.display_name || "Profile picture"}
            onClose={() => setAvatarPreviewOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Long Press Avatar Menu */}
      <Dialog open={avatarMenuOpen} onOpenChange={setAvatarMenuOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="justify-start gap-3 h-12"
              onClick={() => {
                setAvatarMenuOpen(false);
                fileInputRef.current?.click();
              }}
              disabled={uploadingAvatar}
            >
              <Camera className="h-4 w-4" />
              {profile?.avatar_url ? "Change Photo" : "Upload Photo"}
            </Button>
            {profile?.avatar_url && (
              <Button
                variant="outline"
                className="justify-start gap-3 h-12 text-destructive hover:text-destructive"
                onClick={() => {
                  setAvatarMenuOpen(false);
                  handleRemoveAvatar();
                }}
                disabled={removingAvatar}
              >
                {removingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove Photo
              </Button>
            )}
            {profile?.avatar_url && (
              <Button
                variant="outline"
                className="justify-start gap-3 h-12"
                onClick={() => {
                  setAvatarMenuOpen(false);
                  setAvatarPreviewOpen(true);
                }}
              >
                <User className="h-4 w-4" />
                View Photo
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Username Change Dialog */}
      <Dialog open={usernameDialogOpen} onOpenChange={setUsernameDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Username</DialogTitle>
            <DialogDescription>Choose a new username. You can only change it once.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                value={newUsername}
                onChange={(e) => checkUsername(e.target.value)}
                placeholder="new_username"
                className="pl-8 pr-10 h-11"
                maxLength={30}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {usernameStatus === "available" && <Check className="h-4 w-4 text-green-500" />}
                {(usernameStatus === "taken" || usernameStatus === "invalid") && <X className="h-4 w-4 text-destructive" />}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {usernameStatus === "idle" && "3-30 characters, lowercase letters, numbers, and underscores"}
              {usernameStatus === "checking" && "Checking availability..."}
              {usernameStatus === "available" && <span className="text-green-500">✓ Username is available!</span>}
              {usernameStatus === "taken" && <span className="text-destructive">✗ Username is already taken</span>}
              {usernameStatus === "invalid" && <span className="text-destructive">✗ Min 3 chars, only a-z, 0-9, _</span>}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsernameDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveUsername.mutate()}
              disabled={usernameStatus !== "available" || saveUsername.isPending}
            >
              {saveUsername.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Save Username
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Profile;
