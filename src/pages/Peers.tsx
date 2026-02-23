import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { getLevelColor, type Level } from "@/lib/levels";
import { User, Send, MessageCircle, ArrowLeft } from "lucide-react";

const LEVEL_ORDER: Level[] = ["Beginner", "Intermediate", "Advanced"];

function levelsAhead(myLevel: Level, theirLevel: Level): number {
  return LEVEL_ORDER.indexOf(theirLevel) - LEVEL_ORDER.indexOf(myLevel);
}

interface ConversationPreview {
  peerId: string;
  peerName: string;
  peerLevel: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

const Peers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");

  const { data: myProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const myLevel = (myProfile?.computed_level || "Beginner") as Level;

  const targetLevels = LEVEL_ORDER.filter((l) => {
    const diff = levelsAhead(myLevel, l);
    return diff >= 1 && diff <= 2;
  });

  const { data: seniors } = useQuery({
    queryKey: ["recommended_seniors", myLevel],
    queryFn: async () => {
      if (targetLevels.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, role, computed_level, college")
        .in("computed_level", targetLevels)
        .neq("id", user!.id)
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!myProfile,
  });

  // Fetch all conversations (messages involving me)
  const { data: allMessages } = useQuery({
    queryKey: ["all_peer_messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_messages")
        .select("*")
        .or(`from_user_id.eq.${user!.id},to_user_id.eq.${user!.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch profiles for conversation partners
  const peerIds = useMemo(() => {
    if (!allMessages || !user) return [];
    const ids = new Set<string>();
    allMessages.forEach((m) => {
      if (m.from_user_id !== user.id) ids.add(m.from_user_id);
      if (m.to_user_id !== user.id) ids.add(m.to_user_id);
    });
    return Array.from(ids);
  }, [allMessages, user]);

  const { data: peerProfiles } = useQuery({
    queryKey: ["peer_profiles", peerIds],
    queryFn: async () => {
      if (peerIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, computed_level")
        .in("id", peerIds);
      if (error) throw error;
      return data;
    },
    enabled: peerIds.length > 0,
  });

  const conversations: ConversationPreview[] = useMemo(() => {
    if (!allMessages || !user || !peerProfiles) return [];
    const map = new Map<string, ConversationPreview>();

    for (const msg of allMessages) {
      const peerId = msg.from_user_id === user.id ? msg.to_user_id : msg.from_user_id;
      if (!map.has(peerId)) {
        const profile = peerProfiles.find((p) => p.id === peerId);
        map.set(peerId, {
          peerId,
          peerName: profile?.display_name || "Student",
          peerLevel: profile?.computed_level || "Beginner",
          lastMessage: msg.body,
          lastMessageTime: msg.created_at,
          unreadCount: 0,
        });
      }
      const conv = map.get(peerId)!;
      if (msg.to_user_id === user.id && !msg.read) {
        conv.unreadCount++;
      }
    }

    return Array.from(map.values());
  }, [allMessages, user, peerProfiles]);

  // Messages for selected conversation
  const { data: messages } = useQuery({
    queryKey: ["peer_messages", user?.id, selectedPeer],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_messages")
        .select("*")
        .or(
          `and(from_user_id.eq.${user!.id},to_user_id.eq.${selectedPeer}),and(from_user_id.eq.${selectedPeer},to_user_id.eq.${user!.id})`
        )
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!selectedPeer,
  });

  // Real-time subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("peers-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "peer_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.from_user_id === user.id || msg.to_user_id === user.id) {
            queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
            if (selectedPeer && (msg.from_user_id === selectedPeer || msg.to_user_id === selectedPeer)) {
              queryClient.invalidateQueries({ queryKey: ["peer_messages", user.id, selectedPeer] });
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedPeer, queryClient]);

  // Mark as read
  useEffect(() => {
    if (!user || !selectedPeer) return;
    supabase
      .from("peer_messages")
      .update({ read: true })
      .eq("to_user_id", user.id)
      .eq("from_user_id", selectedPeer)
      .eq("read", false)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["unread_peer_messages"] });
        queryClient.invalidateQueries({ queryKey: ["all_peer_messages"] });
      });
  }, [user, selectedPeer, messages, queryClient]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!messageText.trim() || !selectedPeer) return;
      const { error } = await supabase.from("peer_messages").insert({
        from_user_id: user!.id,
        to_user_id: selectedPeer,
        body: messageText.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ["peer_messages"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedProfile = peerProfiles?.find((p) => p.id === selectedPeer) ||
    seniors?.find((s) => s.id === selectedPeer);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Peer Guidance 🤝</h1>
          <p className="text-muted-foreground">Connect with students ahead of you for guidance</p>
        </div>

        <div className="flex gap-4 h-[calc(100vh-12rem)]">
          {/* Conversation sidebar */}
          <Card className="w-80 flex-shrink-0 flex flex-col">
            <div className="p-3 border-b">
              <p className="font-semibold text-sm">Conversations</p>
            </div>
            <ScrollArea className="flex-1">
              {conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground p-4 text-center">No conversations yet</p>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.peerId}
                    onClick={() => setSelectedPeer(conv.peerId)}
                    className={`w-full text-left px-3 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${
                      selectedPeer === conv.peerId ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">{conv.peerName}</p>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
                            {formatTime(conv.lastMessageTime)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                          {conv.unreadCount > 0 && (
                            <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground flex-shrink-0">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </ScrollArea>
          </Card>

          {/* Main content area */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedPeer ? (
              /* Discovery view */
              <Card className="flex-1 overflow-auto">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getLevelColor(myLevel)}>Your Level: {myLevel}</Badge>
                    {targetLevels.length > 0 && (
                      <span className="text-sm text-muted-foreground">
                        Showing {targetLevels.join(" & ")} level peers
                      </span>
                    )}
                  </div>

                  {targetLevels.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">You're at the highest level! 🎉 Consider mentoring others.</p>
                  ) : !seniors || seniors.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No recommended seniors found yet.</p>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold">Recommended Seniors</h2>
                      <div className="grid gap-3 md:grid-cols-2">
                        {seniors.map((senior) => (
                          <div
                            key={senior.id}
                            className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => setSelectedPeer(senior.id)}
                          >
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{senior.display_name || "Student"}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className={`text-[10px] ${getLevelColor(senior.computed_level as Level)}`}>
                                  {senior.computed_level}
                                </Badge>
                                {senior.role && (
                                  <span className="text-xs text-muted-foreground capitalize">{senior.role}</span>
                                )}
                              </div>
                            </div>
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Chat view */
              <Card className="flex-1 flex flex-col">
                <div className="flex items-center gap-3 p-3 border-b">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedPeer(null)}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedProfile?.display_name || "Student"}</p>
                    <Badge variant="outline" className={`text-[10px] ${getLevelColor((selectedProfile?.computed_level || "Beginner") as Level)}`}>
                      {selectedProfile?.computed_level}
                    </Badge>
                  </div>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {(!messages || messages.length === 0) ? (
                    <p className="text-center text-muted-foreground py-12 text-sm">No messages yet. Say hello! 👋</p>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => {
                        const isMine = msg.from_user_id === user!.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                              isMine
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}>
                              <p>{msg.body}</p>
                              <p className={`text-xs mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                <div className="border-t p-3 flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && messageText.trim()) sendMessage.mutate();
                    }}
                  />
                  <Button size="icon" onClick={() => sendMessage.mutate()} disabled={!messageText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Peers;
