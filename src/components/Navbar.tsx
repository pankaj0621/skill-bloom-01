import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Map, UserCircle, LogOut, Users, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/roadmap", label: "Roadmap", icon: Map },
  { to: "/peers", label: "Peers", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

const Navbar = () => {
  const { signOut, user } = useAuth();
  const location = useLocation();

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center px-4 max-w-6xl">
        <Link to="/dashboard" className="font-bold text-lg mr-8">
          🎯 SkillTracker
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
              <span className="hidden sm:inline">{label}</span>
              {to === "/peers" && !!unreadCount && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Sign Out</span>
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
