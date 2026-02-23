import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LayoutDashboard, Map, UserCircle, LogOut, Users, Trophy, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/peers", label: "Peers", icon: Users },
  { to: "/leaderboard", label: "Board", icon: Trophy },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

const Navbar = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  const { data: unreadCount } = useQuery({
    queryKey: ["unread_peer_messages", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peer_messages")
        .select("id")
        .eq("to_user_id", user!.id)
        .eq("read", false);
      if (error) throw error;
      return data?.length || 0;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("global-peer-msgs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "peer_messages" },
        (payload) => {
          const msg = payload.new as any;
          if (msg.to_user_id === user.id) {
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 800;
              gain.gain.value = 0.15;
              osc.start();
              osc.stop(ctx.currentTime + 0.15);
            } catch {}

            toast("New message", {
              description: msg.body?.slice(0, 60) || "You have a new message",
              action: {
                label: "View",
                onClick: () => { window.location.href = "/peers"; },
              },
            });

            queryClient.invalidateQueries({ queryKey: ["unread_peer_messages"] });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return (
    <>
      {/* Desktop top navbar */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 hidden md:block">
        <div className="container mx-auto flex h-14 items-center px-4 max-w-6xl">
          <Link to="/dashboard" className="font-bold text-lg mr-8">
            📊 SPCT
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
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {to === "/peers" && !!unreadCount && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="mr-2">
            {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Mobile top bar - logo + theme + sign out */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="flex h-12 items-center justify-between px-3">
          <Link to="/dashboard" className="font-bold text-base">
            📊 SPCT
          </Link>
          <div className="flex items-center gap-1">
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="flex items-center justify-around h-14 pb-[env(safe-area-inset-bottom)]">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-[10px] font-medium transition-colors",
                location.pathname === to
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
              {to === "/peers" && !!unreadCount && unreadCount > 0 && (
                <span className="absolute top-1 right-1/4 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
