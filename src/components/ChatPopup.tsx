import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useConversations, useChatMessages, useSendMessage, formatMessageTime } from "@/hooks/useMessages";
import { useFriendsList, useFriendship } from "@/hooks/useFriendship";
import { useBlockUser } from "@/hooks/useBlockUser";
import { usePresence, useTypingIndicator } from "@/hooks/usePresence";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { User, Send, ArrowLeft, MessageCircle, Check, CheckCheck, Ban, UserX, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";


interface FriendProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  computed_level: string;
  username?: string | null;
}

interface ChatPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPeerId?: string | null;
}

// ─── Online Status Dot ───
function OnlineDot({ isOnline }: { isOnline: boolean }) {
  return (
    <span
      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background transition-colors duration-300 ${
        isOnline ? "bg-emerald-500" : "bg-muted-foreground/40"
      }`}
      data-small-target
    />
  );
}

// ─── Typing Indicator Animation ───
function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      transition={{ duration: 0.2 }}
      className="flex justify-start"
    >
      <div className="bg-muted rounded-2xl rounded-bl-md px-3 py-2.5 flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Read Receipt Icon ───
function ReadReceipt({ isMine, isRead }: { isMine: boolean; isRead: boolean }) {
  if (!isMine) return null;
  return (
    <span className="inline-flex items-center ml-1">
      {isRead ? (
        <CheckCheck className="h-3 w-3 text-primary" />
      ) : (
        <Check className="h-3 w-3 text-primary-foreground/50" />
      )}
    </span>
  );
}

// ─── Conversation List ───
function ConversationList({
  conversations,
  friends,
  onSelect,
  isOnline,
}: {
  conversations: { peerId: string; peerName: string; peerAvatarUrl: string | null; peerUsername: string | null; lastMessage: string; lastMessageTime: string; unreadCount: number }[];
  friends: FriendProfile[];
  onSelect: (peerId: string) => void;
  isOnline: (id: string) => boolean;
}) {
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
            <div className="relative flex-shrink-0">
              <Avatar className="h-9 w-9">
                {conv.peerAvatarUrl && <AvatarImage src={conv.peerAvatarUrl} alt={conv.peerName} />}
                <AvatarFallback className="bg-muted"><User className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
              </Avatar>
              <OnlineDot isOnline={isOnline(conv.peerId)} />
            </div>
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
          {friendsWithoutConvo.map((friend) => (
            <button
              key={friend.id}
              onClick={() => onSelect(friend.id)}
              className="w-full text-left px-3 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative flex-shrink-0">
                  <Avatar className="h-9 w-9">
                    {friend.avatar_url && <AvatarImage src={friend.avatar_url} alt={friend.display_name} />}
                    <AvatarFallback className="bg-muted"><User className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
                  </Avatar>
                  <OnlineDot isOnline={isOnline(friend.id)} />
                </div>
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

// ─── Chat View ───
function ChatView({
  userId,
  peerId,
  peerProfile,
  onBack,
  onNavigateProfile,
  isOnline,
}: {
  userId: string;
  peerId: string;
  peerProfile: FriendProfile | null | undefined;
  onBack: () => void;
  onNavigateProfile: () => void;
  isOnline: boolean;
}) {
  const { messages } = useChatMessages(userId, peerId);
  const { removeFriend } = useFriendship(userId, peerId);
  const { isBlocked, blockUser } = useBlockUser(userId, peerId);
  const { messageText, setMessageText, sendMessage } = useSendMessage(userId, peerId);
  const { peerIsTyping, broadcastTyping } = useTypingIndicator(userId, peerId);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, peerIsTyping]);

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
          <div className="relative flex-shrink-0">
            <Avatar className="h-8 w-8">
              {peerProfile?.avatar_url && <AvatarImage src={peerProfile.avatar_url} alt={peerProfile?.display_name} />}
              <AvatarFallback className="bg-muted"><User className="h-4 w-4 text-muted-foreground" /></AvatarFallback>
            </Avatar>
            <OnlineDot isOnline={isOnline} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate leading-tight">{peerProfile?.display_name || "Student"}</p>
            <AnimatePresence mode="wait">
              {peerIsTyping ? (
                <motion.p
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-primary leading-tight"
                >
                  typing…
                </motion.p>
              ) : (
                <motion.p
                  key="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-muted-foreground leading-tight"
                >
                  {isOnline ? "online" : "offline"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="ml-auto flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => { removeFriend.mutate(); onBack(); }}
                className="text-destructive focus:text-destructive gap-2"
              >
                <UserX className="h-4 w-4" />
                Unfriend
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => { blockUser.mutate(); onBack(); }}
                className="text-destructive focus:text-destructive gap-2"
              >
                <Ban className="h-4 w-4" />
                Block User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                    <div className={`flex items-center justify-end gap-0.5 mt-1`}>
                      <span className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <ReadReceipt isMine={isMine} isRead={msg.read} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Typing indicator in chat */}
        <AnimatePresence>
          {peerIsTyping && <TypingIndicator />}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="border-t p-2 flex gap-2">
        <Input
          placeholder="Type a message..."
          value={messageText}
          onChange={(e) => {
            setMessageText(e.target.value);
            if (e.target.value.trim()) broadcastTyping();
          }}
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

// ─── Chat Popup Content ───
function ChatPopupContent({ onOpenChange, initialPeerId }: Omit<ChatPopupProps, "open">) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPeer, setSelectedPeer] = useState<string | null>(initialPeerId || null);
  const { conversations, peerProfiles } = useConversations(user?.id);
  const { data: friends } = useFriendsList(user?.id);
  const { isOnline } = usePresence(user?.id);

  useEffect(() => {
    if (initialPeerId) setSelectedPeer(initialPeerId);
  }, [initialPeerId]);

  const selectedProfile = peerProfiles?.find((p) => p.id === selectedPeer) ||
    friends?.find((f) => f.id === selectedPeer);

  if (selectedPeer && user) {
    return (
      <ChatView
        userId={user.id}
        peerId={selectedPeer}
        peerProfile={selectedProfile}
        onBack={() => setSelectedPeer(null)}
        onNavigateProfile={() => {
          onOpenChange(false);
          const username = selectedProfile?.username || selectedPeer;
          navigate(`/user/${username}`);
        }}
        isOnline={isOnline(selectedPeer)}
      />
    );
  }

  return (
    <ConversationList
      conversations={conversations}
      friends={friends || []}
      onSelect={setSelectedPeer}
      isOnline={isOnline}
    />
  );
}

// ─── Main Export ───
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
