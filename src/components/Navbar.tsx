import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LayoutDashboard, Map, UserCircle, LogOut, Trophy, Sun, Moon, UsersRound, MessageCircle, BarChart3, Settings, Shield, MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { useNavbarBadges } from "@/hooks/useNavbarBadges";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { useConversations } from "@/hooks/useMessages";
import { AnimatePresence, motion } from "framer-motion";
import ChatPopup from "@/components/ChatPopup";
import NotificationBell from "@/components/NotificationBell";
import appIcon from "@/assets/app-icon-512.png";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/community", label: "Community", icon: UsersRound },
  { to: "/leaderboard", label: "Board", icon: Trophy },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

const BadgeCount = ({ count, className, ...rest }: { count: number; className?: string; [key: string]: any }) => (
  <AnimatePresence mode="wait">
    <motion.span
      key={count}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={cn("flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground", className)}
      {...rest}
    >
      {count > 99 ? "99+" : count}
    </motion.span>
  </AnimatePresence>
);

const Navbar = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const { resolvedTheme, setTheme } = useTheme();
  const { pendingRequestCount, navProfile } = useNavbarBadges(user?.id);
  const { totalUnread } = useConversations(user?.id);
  const { isAdmin } = useIsAdmin();
  const [chatOpen, setChatOpen] = useState(false);

  useRealtimeNotifications(user?.id);

  const toggleTheme = () => setTheme(resolvedTheme === "dark" ? "light" : "dark");

  const getBadgeCount = (to: string) => {
    if (to === "/community") return pendingRequestCount;
    return 0;
  };

  return (
    <>
      {/* Desktop top navbar */}
      <header className="fixed top-0 left-0 right-0 z-[100] w-full border-b bg-background backdrop-blur-sm hidden md:block">
        <div className="container mx-auto flex h-14 items-center px-4 max-w-6xl">
          <Link to="/dashboard" className="font-bold text-lg mr-8 flex items-center gap-2">
            <img src={appIcon} alt="SPCT" className="w-7 h-7 rounded-md" loading="lazy" decoding="async" />
            SPCT
          </Link>
          <nav className="flex items-center gap-1 flex-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  location.pathname === to
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
              >
                {to === "/profile" && navProfile?.avatar_url ? (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={navProfile.avatar_url} alt="Profile" />
                    <AvatarFallback><Icon className="h-3 w-3" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <Icon className="h-4 w-4" />
                )}
                <span>{label}</span>
                {getBadgeCount(to) > 0 && <BadgeCount count={getBadgeCount(to)} className="absolute -top-1 -right-1" />}
              </Link>
            ))}
          </nav>
          <NotificationBell />
          <Button variant="ghost" size="icon" className="relative mr-1" onClick={() => setChatOpen(true)}>
            <MessageCircle className="h-4 w-4" />
            {totalUnread > 0 && <BadgeCount count={totalUnread} className="absolute -top-1 -right-1" data-small-target />}
          </Button>
          {isAdmin && (
            <Link to="/admin">
              <Button variant="ghost" size="icon" className="text-primary">
                <Shield className="h-4 w-4" />
              </Button>
            </Link>
          )}
          <Link to="/feedback">
            <Button variant="ghost" size="icon" title="Feedback">
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="mr-2">
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="fixed top-0 left-0 right-0 z-[100] w-full border-b bg-background backdrop-blur-sm md:hidden">
        <div className="flex h-12 items-center justify-between px-3">
          <Link to="/dashboard" className="font-bold text-base flex items-center gap-1.5">
            <img src={appIcon} alt="SPCT" className="w-6 h-6 rounded-md" loading="lazy" decoding="async" />
            SPCT
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell className="h-8 w-8" />
            <Button variant="ghost" size="icon" className="relative h-8 w-8" onClick={() => setChatOpen(true)}>
              <MessageCircle className="h-4 w-4" />
              {totalUnread > 0 && <BadgeCount count={totalUnread} className="absolute -top-0.5 -right-0.5" data-small-target />}
            </Button>
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary">
                  <Shield className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link to="/feedback">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Feedback">
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
              {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] border-t bg-background backdrop-blur-sm md:hidden">
        <div className="flex items-stretch justify-around" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {navItems.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[56px] text-[11px] font-medium transition-colors active:bg-muted/50",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
                )}
                {to === "/profile" && navProfile?.avatar_url ? (
                  <Avatar className={cn("h-5 w-5", isActive && "ring-2 ring-primary")}>
                    <AvatarImage src={navProfile.avatar_url} alt="Profile" />
                    <AvatarFallback><Icon className="h-3 w-3" /></AvatarFallback>
                  </Avatar>
                ) : (
                  <Icon className={cn("h-5 w-5", isActive && "scale-110")} style={{ transition: "transform 0.15s ease" }} />
                )}
                <span>{label}</span>
                {getBadgeCount(to) > 0 && <BadgeCount count={getBadgeCount(to)} className="absolute top-1.5 right-1/4" data-small-target />}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Chat Popup */}
      <ChatPopup open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
};

export default Navbar;
