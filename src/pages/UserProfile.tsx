import { useState, useCallback } from "react";
import ChatPopup from "@/components/ChatPopup";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { getLevelColor, type Level } from "@/lib/levels";
import { getLevel } from "@/lib/levels";
import { BADGES } from "@/lib/badges";
import { User, ArrowLeft, MessageCircle, UserPlus, UserCheck, UserX, Clock, ChevronDown, ChevronUp, Loader2, Check, Shield, Ban } from "lucide-react";
import { useFriendship } from "@/hooks/useFriendship";
import { useBlockUser } from "@/hooks/useBlockUser";
import { motion, AnimatePresence } from "framer-motion";

const STREAM_LABELS: Record<string, string> = { btech: "BTech", ba: "BA", bcom: "BCom", bsc: "BSc", other: "Other" };
const GOAL_LABELS: Record<string, string> = { job: "Job", higher_studies: "Higher Studies", competitive_exams: "Competitive Exams", skill_career: "Skill-based Career" };

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [skillsOpen, setSkillsOpen] = useState(true);
  const [badgesOpen, setBadgesOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  

  // Support both UUID and username in URL
  const isUuid = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["public_profile", userId],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, computed_level, stream, college, primary_goal, bio, current_streak, username");

      if (isUuid) {
        query = query.eq("id", userId!);
      } else {
        query = query.eq("username", userId!);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const profileId = profile?.id;
  const isOwnProfile = user?.id === profileId;

  const { data: skillProgress } = useQuery({
    queryKey: ["public_skill_progress", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_skill_progress")
        .select("*, skills(name, skill_tracks(id, name))")
        .eq("user_id", profileId!);
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });

  const { data: userBadges } = useQuery({
    queryKey: ["public_badges", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", profileId!);
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });

  const {
    status: friendStatus,
    isSender,
    isLoading: friendLoading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
  } = useFriendship(user?.id, profileId);

  const isFriend = friendStatus === "accepted";

  const { isBlocked, blockUser, unblockUser } = useBlockUser(user?.id, profileId);

  // Derive track stats
  const trackStats = skillProgress
    ? Object.values(
        skillProgress.reduce((acc: Record<string, { id: string; name: string; total: number; completed: number }>, p: { status: string; skills?: { skill_tracks?: { id?: string; name?: string } | null } | null }) => {
          const trackId = p.skills?.skill_tracks?.id || "unknown";
          const name = p.skills?.skill_tracks?.name || "Unknown";
          if (!acc[trackId]) acc[trackId] = { id: trackId, name, total: 0, completed: 0 };
          acc[trackId].total++;
          if (p.status === "completed") acc[trackId].completed++;
          return acc;
        }, {})
      )
    : [];

  const earnedBadgeKeys = new Set(userBadges?.map((b) => b.badge_key) || []);
  const earnedBadges = BADGES.filter((b) => earnedBadgeKeys.has(b.key));

  if (profileLoading) {
    return (
      <Layout>
        <div className="space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-32" />
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">User not found.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </Layout>
    );
  }

  return (
    <>
    <Layout>
      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </motion.div>

        {/* Profile Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                >
                  <Avatar className="h-20 w-20">
                    {profile.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt={profile.display_name || "User"} />
                    ) : null}
                    <AvatarFallback className="bg-muted text-lg">
                      <User className="h-10 w-10 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <h1 className="text-xl font-bold">{profile.display_name || "Student"}</h1>
                    <Badge className={getLevelColor(profile.computed_level as Level)}>
                      {profile.computed_level}
                    </Badge>
                  </div>
                  {(profile as any).username && (
                    <p className="text-sm text-muted-foreground">@{(profile as any).username}</p>
                  )}

                  {profile.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-sm text-muted-foreground">
                    {profile.stream && <span>📚 {STREAM_LABELS[profile.stream] || profile.stream}</span>}
                    {profile.college && <span>🎓 {profile.college}</span>}
                    {profile.primary_goal && <span>🎯 {GOAL_LABELS[profile.primary_goal] || profile.primary_goal}</span>}
                  </div>

                  {profile.current_streak > 0 && (
                    <p className="text-sm">🔥 {profile.current_streak} day streak</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <motion.div
                  className="flex flex-wrap gap-2 mt-4 pt-4 border-t"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.2 }}
                >
                  {isBlocked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => unblockUser.mutate()}
                      disabled={unblockUser.isPending}
                    >
                      {unblockUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                      Unblock
                    </Button>
                  ) : (
                    <>
                      <FriendButton
                        status={friendStatus}
                        isSender={isSender}
                        isLoading={friendLoading}
                        onSend={() => sendRequest.mutate()}
                        onAccept={() => acceptRequest.mutate()}
                        onReject={() => rejectRequest.mutate()}
                        onRemove={() => removeFriend.mutate()}
                        isMutating={sendRequest.isPending || acceptRequest.isPending || rejectRequest.isPending || removeFriend.isPending}
                      />
                      {isFriend && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setChatOpen(true)}
                        >
                          <MessageCircle className="h-4 w-4" />
                          Message
                        </Button>
                      )}
                      {!isFriend && friendStatus !== "pending" && (
                        <p className="text-xs text-muted-foreground self-center ml-1">
                          <Shield className="h-3 w-3 inline mr-1" />
                          Become friends to message
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => blockUser.mutate()}
                        disabled={blockUser.isPending}
                      >
                        {blockUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                        Block
                      </Button>
                    </>
                  )}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Skill Tracks */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <Collapsible open={skillsOpen} onOpenChange={setSkillsOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Skill Tracks</CardTitle>
                    <motion.div animate={{ rotate: skillsOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-2">
                  <AnimatePresence>
                    {trackStats.length > 0 ? (
                      trackStats.map((track, i) => {
                        const lvl = getLevel(track.completed, track.total);
                        const pct = track.total > 0 ? Math.round((track.completed / track.total) * 100) : 0;
                        return (
                          <motion.div
                            key={track.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.05 }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{track.name}</span>
                                <Badge variant="outline" className={`text-[10px] ${getLevelColor(lvl)}`}>{lvl}</Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full bg-primary"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${pct}%` }}
                                    transition={{ duration: 0.6, delay: i * 0.1 }}
                                  />
                                </div>
                                <span className="text-[11px] text-muted-foreground flex-shrink-0">{track.completed}/{track.total}</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No skill tracks yet</p>
                    )}
                  </AnimatePresence>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>

        {/* Badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
        >
          <Collapsible open={badgesOpen} onOpenChange={setBadgesOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Badges ({earnedBadges.length})</CardTitle>
                    <motion.div animate={{ rotate: badgesOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  {earnedBadges.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {earnedBadges.map((badge, i) => {
                        const Icon = badge.icon;
                        return (
                          <motion.div
                            key={badge.key}
                            className="flex items-center gap-2.5 p-3 rounded-lg border bg-muted/30"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.25, delay: i * 0.08 }}
                          >
                            <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{badge.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{badge.description}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No badges earned yet</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </motion.div>
      </div>
    </Layout>
    <ChatPopup open={chatOpen} onOpenChange={setChatOpen} initialPeerId={profile?.id} />
    </>
  );
};

// Animated Friend Button Component
interface FriendButtonProps {
  status: string;
  isSender: boolean;
  isLoading: boolean;
  isMutating: boolean;
  onSend: () => void;
  onAccept: () => void;
  onReject: () => void;
  onRemove: () => void;
}

const FriendButton = ({ status, isSender, isLoading, isMutating, onSend, onAccept, onReject, onRemove }: FriendButtonProps) => {
  if (isLoading) {
    return <Button size="sm" disabled><Loader2 className="h-4 w-4 animate-spin mr-1.5" />Loading</Button>;
  }

  return (
    <AnimatePresence mode="wait">
      {status === "none" || status === "rejected" ? (
        <motion.div key="add" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
          <Button size="sm" onClick={onSend} disabled={isMutating} className="gap-1.5">
            {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Add Friend
          </Button>
        </motion.div>
      ) : status === "pending" && isSender ? (
        <motion.div key="pending" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
          <Button size="sm" variant="secondary" disabled className="gap-1.5">
            <Clock className="h-4 w-4" />
            Request Sent
          </Button>
        </motion.div>
      ) : status === "pending" && !isSender ? (
        <motion.div key="respond" className="flex gap-1.5" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
          <Button size="sm" onClick={onAccept} disabled={isMutating} className="gap-1.5">
            {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={onReject} disabled={isMutating}>
            <UserX className="h-4 w-4" />
          </Button>
        </motion.div>
      ) : status === "accepted" ? (
        <motion.div key="friends" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }}>
          <Button size="sm" variant="secondary" onClick={onRemove} disabled={isMutating} className="gap-1.5">
            {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
            Friends
          </Button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default UserProfile;
