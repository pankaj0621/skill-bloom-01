import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLevelColor, type Level } from "@/lib/levels";
import { User, Search, UserPlus, UserCheck, Users, Bell } from "lucide-react";
import { useFriendRequests, useFriendsList } from "@/hooks/useFriendship";
import { motion, AnimatePresence } from "framer-motion";

const Community = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discover");

  const { data: friendRequests } = useFriendRequests(user?.id);
  const { data: friends } = useFriendsList(user?.id);

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["user_search", searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      const q = searchQuery.trim().toLowerCase();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, computed_level, stream, college")
        .neq("id", user!.id)
        .or(`display_name.ilike.%${q}%,stream.ilike.%${q}%,college.ilike.%${q}%,computed_level.ilike.%${q}%`)
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && searchQuery.trim().length >= 2,
  });

  const pendingCount = friendRequests?.length || 0;

  return (
    <Layout>
      <div className="space-y-4 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl md:text-3xl font-bold">Community 👥</h1>
          <p className="text-sm text-muted-foreground">Discover, connect, and grow together</p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, stream, level, or college..."
              className="pl-9 h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </motion.div>

        {/* Search Results */}
        <AnimatePresence>
          {searchQuery.trim().length >= 2 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Search Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  {searching ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3 p-2.5">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    ))
                  ) : !searchResults || searchResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                  ) : (
                    searchResults.map((u, i) => (
                      <motion.div
                        key={u.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.04 }}
                      >
                        <UserRow user={u} onClick={() => navigate(`/user/${u.id}`)} />
                      </motion.div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs: Friends / Requests */}
        {searchQuery.trim().length < 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="discover" className="flex-1 gap-1.5">
                  <Users className="h-4 w-4" />
                  Friends
                  {friends && friends.length > 0 && (
                    <span className="text-[10px] bg-muted rounded-full px-1.5">{friends.length}</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="requests" className="flex-1 gap-1.5 relative">
                  <Bell className="h-4 w-4" />
                  Requests
                  {pendingCount > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="discover" className="mt-3">
                <Card>
                  <CardContent className="p-3 space-y-1">
                    {!friends || friends.length === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <UserPlus className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium">No friends yet</p>
                        <p className="text-xs text-muted-foreground">Search for users or visit profiles from the leaderboard to add friends!</p>
                      </div>
                    ) : (
                      friends.map((f: any, i: number) => (
                        <motion.div
                          key={f.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.04 }}
                        >
                          <UserRow user={f} onClick={() => navigate(`/user/${f.id}`)} showBadge />
                        </motion.div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="requests" className="mt-3">
                <Card>
                  <CardContent className="p-3 space-y-1">
                    {pendingCount === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <Bell className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium">No pending requests</p>
                        <p className="text-xs text-muted-foreground">Friend requests you receive will appear here</p>
                      </div>
                    ) : (
                      (friendRequests || []).map((req: any, i: number) => {
                        const profile = req.profiles || {};
                        return (
                          <motion.div
                            key={req.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: i * 0.04 }}
                          >
                            <UserRow
                              user={{
                                id: req.requester_id,
                                display_name: profile.display_name || "Student",
                                avatar_url: profile.avatar_url,
                                computed_level: profile.computed_level || "Beginner",
                                stream: profile.stream,
                                college: profile.college,
                              }}
                              onClick={() => navigate(`/user/${req.requester_id}`)}
                              isRequest
                            />
                          </motion.div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

interface UserRowProps {
  user: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    computed_level: string;
    stream?: string | null;
    college?: string | null;
  };
  onClick: () => void;
  showBadge?: boolean;
  isRequest?: boolean;
}

const UserRow = ({ user, onClick, showBadge, isRequest }: UserRowProps) => (
  <div
    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors active:scale-[0.98]"
    onClick={onClick}
  >
    <Avatar className="h-9 w-9 flex-shrink-0">
      {user.avatar_url ? <AvatarImage src={user.avatar_url} alt={user.display_name || "User"} /> : null}
      <AvatarFallback className="bg-muted">
        <User className="h-4 w-4 text-muted-foreground" />
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-medium truncate">{user.display_name || "Student"}</p>
        <Badge variant="outline" className={`text-[10px] ${getLevelColor(user.computed_level as Level)}`}>
          {user.computed_level}
        </Badge>
      </div>
      {(user.stream || user.college) && (
        <p className="text-[11px] text-muted-foreground truncate">
          {[user.stream, user.college].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
    {showBadge && <UserCheck className="h-4 w-4 text-primary flex-shrink-0" />}
    {isRequest && <UserPlus className="h-4 w-4 text-primary flex-shrink-0" />}
  </div>
);

export default Community;
