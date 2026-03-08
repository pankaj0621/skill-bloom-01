import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityFeed, type FeedItem } from "@/hooks/useActivityFeed";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, CheckCircle2, Flame, TrendingUp, User, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { icon: typeof Trophy; color: string; bg: string }> = {
  badge: { icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
  level_up: { icon: TrendingUp, color: "text-violet-500", bg: "bg-violet-500/10" },
  skill_completed: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  streak: { icon: Flame, color: "text-orange-500", bg: "bg-orange-500/10" },
};

const FeedItemCard = ({ item, index }: { item: FeedItem; index: number }) => {
  const navigate = useNavigate();
  const config = typeConfig[item.type] || typeConfig.badge;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
    >
      <div
        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => navigate(`/user/${item.userId}`)}
      >
        <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
          {item.avatarUrl ? (
            <AvatarImage src={item.avatarUrl} alt={item.displayName} />
          ) : null}
          <AvatarFallback className="bg-muted">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="text-sm leading-snug">
            <span className="font-semibold">{item.displayName}</span>{" "}
            <span className="text-muted-foreground">{item.title}</span>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
          </p>
        </div>

        <div className={cn("flex-shrink-0 p-1.5 rounded-full", config.bg)}>
          <Icon className={cn("h-3.5 w-3.5", config.color)} />
        </div>
      </div>
    </motion.div>
  );
};

const ActivityFeed = () => {
  const { user } = useAuth();
  const { data: feed, isLoading } = useActivityFeed(user?.id);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Friend Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!feed || feed.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Friend Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-1.5">
            <Users className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs text-muted-foreground">
              Add friends to see their progress here!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Friend Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 pt-0">
        <div className="divide-y divide-border/50">
          {feed.map((item, i) => (
            <FeedItemCard key={item.id} item={item} index={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
