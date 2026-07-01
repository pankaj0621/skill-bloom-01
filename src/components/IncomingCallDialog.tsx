import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { Phone, PhoneOff, Video, User } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  peerName: string;
  peerAvatarUrl?: string | null;
  kind: "audio" | "video";
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallDialog({ peerName, peerAvatarUrl, kind, onAccept, onDecline }: Props) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onDecline(); }}>
      <DialogContent className="max-w-sm z-[300] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Incoming {kind} call from {peerName}</DialogTitle>
          <DialogDescription>Accept or decline the incoming call.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 p-6 bg-gradient-to-b from-primary/10 to-background">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Incoming {kind === "video" ? "video" : "voice"} call
          </p>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Avatar className="h-24 w-24">
              {peerAvatarUrl && <AvatarImage src={peerAvatarUrl} alt={peerName} />}
              <AvatarFallback className="bg-muted"><User className="h-10 w-10 text-muted-foreground" /></AvatarFallback>
            </Avatar>
          </motion.div>
          <p className="text-lg font-semibold">{peerName}</p>
          <div className="flex items-center gap-6 mt-2">
            <Button size="icon" variant="destructive" className="h-14 w-14 rounded-full" onClick={onDecline} aria-label="Decline">
              <PhoneOff className="h-6 w-6" />
            </Button>
            <Button size="icon" className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700" onClick={onAccept} aria-label="Accept">
              {kind === "video" ? <Video className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
