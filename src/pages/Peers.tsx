import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Find users 1-2 levels ahead
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

  // Real-time subscription for messages
  useEffect(() => {
    if (!user || !selectedPeer) return;
    const channel = supabase
      .channel(`peer-msgs-${selectedPeer}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "peer_messages" },
        (payload) => {
          const msg = payload.new as any;
          const isRelevant =
            (msg.from_user_id === user.id && msg.to_user_id === selectedPeer) ||
            (msg.from_user_id === selectedPeer && msg.to_user_id === user.id);
          if (isRelevant) {
            queryClient.invalidateQueries({ queryKey: ["peer_messages", user.id, selectedPeer] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, selectedPeer, queryClient]);

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

  const selectedSenior = seniors?.find((s) => s.id === selectedPeer);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Peer Guidance 🤝</h1>
          <p className="text-muted-foreground">Connect with students ahead of you for guidance</p>
        </div>

        {!selectedPeer ? (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getLevelColor(myLevel)}>Your Level: {myLevel}</Badge>
              {targetLevels.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Showing {targetLevels.join(" & ")} level peers
                </span>
              )}
            </div>

            {targetLevels.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">You're at the highest level! 🎉 Consider mentoring others.</p>
                </CardContent>
              </Card>
            ) : !seniors || seniors.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No recommended seniors found yet. Check back as more students join!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Recommended Seniors</h2>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {seniors.map((senior) => (
                    <Card key={senior.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedPeer(senior.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{senior.display_name || "Student"}</p>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={getLevelColor(senior.computed_level as Level)}>
                                {senior.computed_level}
                              </Badge>
                              {senior.role && (
                                <span className="text-xs text-muted-foreground capitalize">{senior.role}</span>
                              )}
                            </div>
                            {senior.college && (
                              <p className="text-xs text-muted-foreground mt-1">{senior.college}</p>
                            )}
                          </div>
                          <MessageCircle className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Conversation view */
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedPeer(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">{selectedSenior?.display_name || "Student"}</p>
                <Badge variant="outline" className={getLevelColor((selectedSenior?.computed_level || "Beginner") as Level)}>
                  {selectedSenior?.computed_level}
                </Badge>
              </div>
            </div>

            <Card className="h-[400px] flex flex-col">
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
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Peers;
