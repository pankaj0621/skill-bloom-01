import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useConversations, useChatMessages, useSendMessage, formatMessageTime } from "@/hooks/useMessages";
import { useFriendsList } from "@/hooks/useFriendship";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { User, Send, ArrowLeft, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPeerId?: string | null;
}

function ConversationList({
  conversations,
  friends,
  onSelect,
}: {
  conversations: { peerId: string; peerName: string; peerAvatarUrl: string | null; peerUsername: string | null; lastMessage: string; lastMessageTime: string; unreadCount: number }[];
  friends: any[];
  onSelect: (peerId: string) => void;
}) {
  // Merge friends who have no conversation yet
  const conversationPeerIds = new Set(conversations.map((c) => c.peerId));
  const friendsWithoutConvo = (friends || []).filter((f) => !conversationPeerIds.has(f.id));

  return (
    <ScrollArea className="flex-1">
      {conversations.length === 0 && friendsWithoutConvo.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <MessageCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No conversations yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Add friends to start messaging</p>
        </div>
      )}

      {conversations.map((conv) => (
        <button
          key={conv.peerId}
          onClick={() => onSelect(conv.peerId)}
          className="w-full text-left px-3 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <Avatar className="h-9 w-9 flex-shrink-0">
              {conv.peerAvatarUrl && <AvatarImage src={conv.peerAvatarUrl} alt={conv.peerName} />}
              <AvatarFallback className="bg-muted"><User className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium truncate">{conv.peerName}</p>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">
                  {formatMessageTime(conv.lastMessageTime)}
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
      ))}

      {friendsWithoutConvo.length > 0 && (
        <>
          <div className="px-3 py-2 border-b border-border/50">
            <p className="text-xs font-medium text-muted-foreground">Friends</p>
          </div>
          {friendsWithoutConvo.map((friend: any) => (
            <button
              key={friend.id}
              onClick={() => onSelect(friend.id)}
              className="w-full text-left px-3 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Avatar className="h-9 w-9 flex-shrink-0">
                  {friend.avatar_url && <AvatarImage src={friend.avatar_url} alt={friend.display_name} />}
                  <AvatarFallback className="bg-muted"><User className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{friend.display_name || "Student"}</p>
                  <p className="text-xs text-muted-foreground">Tap to message</p>
                </div>
                <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </div>
            </button>
          ))}
        </>
      )}
    </ScrollArea>
  );
}

function ChatView({
  userId,
  peerId,
  peerProfile,
  onBack,
  onNavigateProfile,
}: {
  userId: string;
  peerId: string;
  peerProfile: any;
  onBack: () => void;
  onNavigateProfile: () => void;
}) {
  const { messages } = useChatMessages(userId, peerId);
  const { messageText, setMessageText, sendMessage } = useSendMessage(userId, peerId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b min-h-[52px]">
        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity min-w-0"
          onClick={onNavigateProfile}
        >
          <Avatar className="h-8 w-8 flex-shrink-0">
            {peerProfile?.avatar_url && <AvatarImage src={peerProfile.avatar_url} alt={peerProfile?.display_name} />}
            <AvatarFallback className="bg-muted"><User className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
          </Avatar>
          <p className="font-medium text-sm truncate">{peerProfile?.display_name || "Student"}</p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {(!messages || messages.length === 0) ? (
          <p className="text-center text-muted-foreground py-12 text-sm">No messages yet. Say hello! 👋</p>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMine = msg.from_user_id === userId;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    <p className="break-words">{msg.body}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      <div className="border-t p-2 flex gap-2">
        <Input
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && messageText.trim()) sendMessage.mutate();
          }}
          className="text-sm"
        />
        <Button
          size="icon"
          onClick={() => sendMessage.mutate()}
          disabled={!messageText.trim()}
          className="flex-shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ChatPopupContent({ onOpenChange, initialPeerId }: Omit<ChatPopupProps, "open">) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPeer, setSelectedPeer] = useState<string | null>(initialPeerId || null);
  const { conversations, peerProfiles } = useConversations(user?.id);
  const { data: friends } = useFriendsList(user?.id);

  useEffect(() => {
    if (initialPeerId) setSelectedPeer(initialPeerId);
  }, [initialPeerId]);

  const selectedProfile = peerProfiles?.find((p) => p.id === selectedPeer) ||
    friends?.find((f: any) => f.id === selectedPeer);

  if (selectedPeer && user) {
    return (
      <ChatView
        userId={user.id}
        peerId={selectedPeer}
        peerProfile={selectedProfile}
        onBack={() => setSelectedPeer(null)}
        onNavigateProfile={() => {
          onOpenChange(false);
          const username = (selectedProfile as any)?.username || selectedPeer;
          navigate(`/user/${username}`);
        }}
      />
    );
  }

  return (
    <ConversationList
      conversations={conversations}
      friends={friends || []}
      onSelect={setSelectedPeer}
    />
  );
}

export default function ChatPopup({ open, onOpenChange, initialPeerId }: ChatPopupProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh] max-h-[85vh]">
          <DrawerHeader className="py-2 px-3 border-b">
            <DrawerTitle className="text-base">Messages</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden flex flex-col">
            <ChatPopupContent onOpenChange={onOpenChange} initialPeerId={initialPeerId} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0 flex flex-col">
        <SheetHeader className="py-3 px-4 border-b">
          <SheetTitle className="text-base">Messages</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden flex flex-col">
          <ChatPopupContent onOpenChange={onOpenChange} initialPeerId={initialPeerId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
