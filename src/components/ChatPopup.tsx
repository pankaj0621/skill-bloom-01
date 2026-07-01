import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useConversations, useChatMessages, useSendMessage, useEditMessage, useDeleteMessage, formatMessageTime } from "@/hooks/useMessages";
import { useFriendsList, useFriendship } from "@/hooks/useFriendship";
import { useBlockUser } from "@/hooks/useBlockUser";
import { usePresence, useTypingIndicator } from "@/hooks/usePresence";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { User, Send, ArrowLeft, MessageCircle, Check, CheckCheck, Ban, UserX, MoreVertical, Pencil, Trash2, X, Phone, Video, Paperclip, Timer, Clock, Image as ImageIcon, Loader2 } from "lucide-react";
import { useCall } from "@/contexts/CallContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { MediaAttachment } from "@/components/MediaAttachment";
import { useChatSettings } from "@/hooks/useChatSettings";
import { DISAPPEAR_OPTIONS, disappearLabel, timeUntil, uploadChatMedia, formatBytes, MAX_MEDIA_BYTES, kindFromMime, type UploadedMedia } from "@/lib/chatMedia";
import { toast } from "sonner";


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
  const editMessage = useEditMessage(userId, peerId);
  const { deleteForEveryone, deleteForMe } = useDeleteMessage(userId, peerId);
  const { peerIsTyping, broadcastTyping } = useTypingIndicator(userId, peerId);
  const { startCall } = useCall();
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<
    | { messageId: string; scope: "everyone" | "me"; existing: string[] }
    | null
  >(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, peerIsTyping, messageText]);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  const startEdit = (msg: { id: string; body: string }) => {
    setEditingId(msg.id);
    setEditDraft(msg.body);
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(""); };
  const commitEdit = async () => {
    if (!editingId) return;
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    await editMessage.mutateAsync({ messageId: editingId, newBody: trimmed });
    cancelEdit();
  };

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
                <motion.p key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-primary leading-tight">
                  typing…
                </motion.p>
              ) : (
                <motion.p key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[10px] text-muted-foreground leading-tight">
                  {isOnline ? "online" : "offline"}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
        <div className="ml-auto flex-shrink-0 flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Voice call"
            onClick={() =>
              startCall({ peerId, peerName: peerProfile?.display_name || "Student", peerAvatarUrl: peerProfile?.avatar_url, kind: "audio" })
            }
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Video call"
            onClick={() =>
              startCall({ peerId, peerName: peerProfile?.display_name || "Student", peerAvatarUrl: peerProfile?.avatar_url, kind: "video" })
            }
          >
            <Video className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 touch-manipulation" aria-label="Chat actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[260] min-w-[180px]">
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => { removeFriend.mutate(); onBack(); }, 80);
                }}
                className="text-destructive focus:text-destructive gap-2"
              >
                <UserX className="h-4 w-4" />
                Unfriend
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setTimeout(() => { blockUser.mutate(); onBack(); }, 80);
                }}
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 pb-6 space-y-2 overscroll-contain">
        {(!messages || messages.length === 0) ? (
          <p className="text-center text-muted-foreground py-12 text-sm">No messages yet. Say hello! 👋</p>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isMine = msg.from_user_id === userId;
              const deletedForAll = (msg as { deleted_for_everyone?: boolean }).deleted_for_everyone;
              const editedAt = (msg as { edited_at?: string | null }).edited_at;
              const existingDeletes = (msg as { deleted_for_user_ids?: string[] }).deleted_for_user_ids || [];
              const canEdit = isMine && !deletedForAll && Date.now() - new Date(msg.created_at).getTime() < 15 * 60 * 1000;
              const isEditing = editingId === msg.id;

              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${isMine ? "justify-end" : "justify-start"} group`}
                >
                  <div className={`flex items-end gap-1 max-w-[85%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        deletedForAll
                          ? "bg-muted/60 text-muted-foreground italic"
                          : isMine
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            ref={editInputRef}
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") { e.preventDefault(); commitEdit(); }
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="h-7 text-sm bg-background/90 text-foreground min-w-[160px]"
                          />
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={commitEdit} disabled={!editDraft.trim() || editMessage.isPending}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEdit}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <p className="break-words whitespace-pre-wrap">
                          {deletedForAll ? "🚫 This message was deleted" : msg.body}
                        </p>
                      )}
                      <div className="flex items-center justify-end gap-1 mt-1">
                        {editedAt && !deletedForAll && !isEditing && (
                          <span className={`text-[9px] ${isMine ? "text-primary-foreground/60" : "text-muted-foreground/70"}`}>edited</span>
                        )}
                        <span className={`text-[10px] ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {!deletedForAll && <ReadReceipt isMine={isMine} isRead={msg.read} />}
                      </div>
                    </div>

                    {/* Message action menu — hidden while editing or if server row not yet ready */}
                    {!isEditing && !msg.id.startsWith("temp-") && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0 touch-manipulation opacity-100 md:h-6 md:w-6 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                            aria-label="Message actions"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isMine ? "end" : "start"} className="z-[260] min-w-[190px]">
                          {canEdit && !deletedForAll && (
                            <>
                              <DropdownMenuItem onClick={() => startEdit({ id: msg.id, body: msg.body })} className="gap-2">
                                <Pencil className="h-3.5 w-3.5" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {isMine && !deletedForAll && (
                            <DropdownMenuItem
                              onSelect={(e) => {
                                e.preventDefault();
                                // Wait for the dropdown to fully close before opening the
                                // AlertDialog — otherwise Radix leaves body pointer-events
                                // stuck and the whole UI freezes.
                                setTimeout(() => setConfirmDelete({ messageId: msg.id, scope: "everyone", existing: existingDeletes }), 80);
                              }}
                              className="text-destructive focus:text-destructive gap-2"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Delete for everyone
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setTimeout(() => setConfirmDelete({ messageId: msg.id, scope: "me", existing: existingDeletes }), 80);
                            }}
                            className="gap-2"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete for me
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        <AnimatePresence>
          {peerIsTyping && <TypingIndicator />}
        </AnimatePresence>

        <div ref={bottomRef} className="h-1" aria-hidden />
      </div>

      {/* Input */}
      <div
        className="border-t p-2 flex gap-2 bg-background flex-shrink-0"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}
      >
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

      {/* Confirm delete dialog */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => {
          if (!o) {
            setConfirmDelete(null);
            // Safety net: Radix sometimes forgets to clear this when a dialog
            // is opened from within another modal (dropdown → drawer). Without
            // this the entire app appears frozen.
            setTimeout(() => {
              if (document.body.style.pointerEvents === "none") {
                document.body.style.pointerEvents = "";
              }
            }, 100);
          }
        }}
      >
        <AlertDialogContent className="z-[300]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.scope === "everyone" ? "Delete for everyone?" : "Delete for you?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.scope === "everyone"
                ? "This message will be removed for everyone in this chat. This cannot be undone."
                : "This message will be hidden only on your side. The other person will still see it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!confirmDelete) return;
                const target = confirmDelete;
                // Close dialog immediately for snappy UX; fire mutation in background.
                setConfirmDelete(null);
                if (target.scope === "everyone") {
                  deleteForEveryone.mutate(target.messageId);
                } else {
                  deleteForMe.mutate({ messageId: target.messageId, existing: target.existing });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          const username = (selectedProfile as { username?: string })?.username || selectedPeer;
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
        <DrawerContent className="h-[90dvh] max-h-[90dvh] z-[150] flex flex-col p-0">
          <DrawerHeader className="py-2 px-3 border-b flex-shrink-0">
            <DrawerTitle className="text-base">Messages</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <ChatPopupContent onOpenChange={onOpenChange} initialPeerId={initialPeerId} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0 flex flex-col z-[150]">
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
