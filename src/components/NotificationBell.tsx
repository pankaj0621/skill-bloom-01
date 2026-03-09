import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, UserPlus, MessageCircle, Trophy, TrendingUp, Check, CheckCheck, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  friend_request: { icon: UserPlus, color: "text-primary" },
  message: { icon: MessageCircle, color: "text-emerald-500" },
  badge: { icon: Trophy, color: "text-amber-500" },
  level_up: { icon: TrendingUp, color: "text-violet-500" },
};

const NotificationItem = ({
  notification,
  onRead,
  onDelete,
  index,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
  index: number;
}) => {
  const config = typeConfig[notification.type] || { icon: Bell, color: "text-muted-foreground" };
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-colors group",
        notification.read ? "opacity-60" : "bg-accent/40"
      )}
    >
      <div className={cn("mt-0.5 flex-shrink-0 p-1.5 rounded-full bg-background border", config.color)}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      <div className="flex-1 min-w-0 space-y-0.5">
        <p className={cn("text-sm leading-tight", !notification.read && "font-semibold")}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-[11px] text-muted-foreground line-clamp-2">{notification.body}</p>
        )}
        <p className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!notification.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-6 md:w-6"
            onClick={(e) => {
              e.stopPropagation();
              onRead(notification.id);
            }}
          >
            <Check className="h-4 w-4 md:h-3 md:w-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 md:h-6 md:w-6 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
        >
          <Trash2 className="h-4 w-4 md:h-3 md:w-3" />
        </Button>
      </div>
    </motion.div>
  );
};

interface NotificationBellProps {
  className?: string;
}

const NotificationBell = ({ className }: NotificationBellProps) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications(user?.id);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("relative", className)}>
          <Bell className="h-4 w-4" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 p-0 overflow-hidden"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[11px] gap-1 text-muted-foreground"
                onClick={() => markAllAsRead()}
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="max-h-[360px]">
          {notifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">You're all caught up!</p>
            </div>
          ) : (
            <div className="p-1.5 space-y-0.5">
              <AnimatePresence>
                {notifications.map((n, i) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onRead={markAsRead}
                    onDelete={deleteNotification}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
