import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getLevelColor, type Level } from "@/lib/levels";
import { User, UserCheck, UserPlus, GraduationCap, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";

interface UserProfileCardProps {
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    computed_level: string;
    stream?: string | null;
    college?: string | null;
    username?: string | null;
    bio?: string | null;
  };
  onClick: () => void;
  showBadge?: boolean;
  isRequest?: boolean;
  index?: number;
}

const UserProfileCard = ({ user, onClick, showBadge, isRequest, index = 0 }: UserProfileCardProps) => {
  const { user: me } = useAuth();
  const { isOnline } = usePresence(me?.id);
  const online = isOnline(user.id);

  return (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, delay: index * 0.04 }}
  >
    <Card
      className="cursor-pointer hover:shadow-md hover:border-primary/30 transition-all duration-200 active:scale-[0.98] overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="h-12 w-12 ring-2 ring-border">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user.display_name || "User"} />
              ) : null}
              <AvatarFallback className="bg-muted">
                <User className="h-5 w-5 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            {online && (
              <span
                className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-card"
                aria-label="Online"
                title="Online"
              />
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold truncate">{user.display_name || "Student"}</p>
              {user.username && (
                <span className="text-[11px] text-muted-foreground">@{user.username}</span>
              )}
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 ${getLevelColor(user.computed_level as Level)}`}
              >
                {user.computed_level}
              </Badge>
              {showBadge && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                  <UserCheck className="h-3 w-3" /> Friend
                </Badge>
              )}
              {isRequest && (
                <Badge className="text-[10px] px-1.5 py-0 gap-0.5 bg-primary/10 text-primary border-primary/20">
                  <UserPlus className="h-3 w-3" /> Request
                </Badge>
              )}
            </div>

            {(user.stream || user.college) && (
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                {user.stream && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {user.stream}
                  </span>
                )}
                {user.college && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" />
                    {user.college}
                  </span>
                )}
              </div>
            )}

            {user.bio && (
              <p className="text-[11px] text-muted-foreground line-clamp-1">{user.bio}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default UserProfileCard;
