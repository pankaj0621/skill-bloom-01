import { useState } from "react";
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { LayoutDashboard, Map, UserCircle, LogOut, Trophy, Sun, Moon, UsersRound, MessageCircle, BarChart3, Settings, Shield, MessageSquarePlus, Brain, TrendingUp } from "lucide-react";
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
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/ai-hub", label: "AI Tools", icon: Brain },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/community", label: "Community", icon: UsersRound },
  { to: "/leaderboard", label: "Board", icon: Trophy },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

// Mobile shows 5 with AI as floating center action
const mobileLeft = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/roadmap", label: "Path", icon: Map },
];
const mobileRight = [
  { to: "/community", label: "Social", icon: UsersRound },
  { to: "/profile", label: "Me", icon: UserCircle },
];


const BadgeCount = ({ count, className }: { count: number; className?: string }) => (
  <AnimatePresence mode="wait">
    <motion.span
      key={count}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={cn("flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground", className)}
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
            <img src={appIcon} alt="Level Up" className="w-7 h-7 rounded-md" loading="lazy" decoding="async" />
            Level Up
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
            <img src={appIcon} alt="Level Up" className="w-6 h-6 rounded-md" loading="lazy" decoding="async" />
            Level Up
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

      {/* Mobile floating dock with center AI action */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] md:hidden pointer-events-none"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      >
        <nav className="pointer-events-auto mx-auto w-[min(94%,360px)] px-2">
          <div className="relative flex items-center justify-between px-2 py-2.5 bg-background/70 backdrop-blur-2xl border border-border/60 rounded-[28px] shadow-2xl shadow-primary/10">
            {mobileLeft.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {isActive && <span className="absolute inset-0 bg-primary/10 rounded-2xl scale-90" />}
                  <Icon className="w-5 h-5 mb-0.5 relative z-10" />
                  <span className={cn("text-[10px] font-medium tracking-wide relative z-10", isActive && "text-primary")}>{label}</span>
                  {isActive && <span className="absolute -bottom-0.5 w-1 h-1 bg-accent rounded-full shadow-[0_0_8px_hsl(var(--accent))]" />}
                </Link>
              );
            })}

            {/* Center floating AI action */}
            <div className="relative -mt-9">
              <div className="absolute inset-0 bg-primary blur-xl opacity-30" />
              <Link
                to="/ai-hub"
                className={cn(
                  "relative flex items-center justify-center w-14 h-14 rounded-full text-primary-foreground active:scale-95 transition-transform shadow-lg",
                  "bg-gradient-to-tr from-primary to-primary/80 border-4 border-background"
                )}
                aria-label="AI Tools"
              >
                <Brain className="w-6 h-6" />
              </Link>
            </div>

            {mobileRight.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              const badge = getBadgeCount(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-14 h-12 rounded-2xl transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {isActive && <span className="absolute inset-0 bg-primary/10 rounded-2xl scale-90" />}
                  {to === "/profile" && navProfile?.avatar_url ? (
                    <div className={cn("relative p-0.5 rounded-full border mb-0.5 z-10", isActive ? "border-primary" : "border-border")}>
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={navProfile.avatar_url} alt="Profile" />
                        <AvatarFallback><Icon className="h-3 w-3" /></AvatarFallback>
                      </Avatar>
                    </div>
                  ) : (
                    <Icon className="w-5 h-5 mb-0.5 relative z-10" />
                  )}
                  <span className={cn("text-[10px] font-medium tracking-wide relative z-10", isActive && "text-primary")}>{label}</span>
                  {isActive && <span className="absolute -bottom-0.5 w-1 h-1 bg-accent rounded-full shadow-[0_0_8px_hsl(var(--accent))]" />}
                  {badge > 0 && (
                    <span className="absolute top-1 right-2 z-20 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground border-2 border-background">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>


      {/* Chat Popup */}
      <ChatPopup open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
};

export default Navbar;
