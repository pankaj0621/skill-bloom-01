import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, Users, Bell } from "lucide-react";
import { useFriendRequests, useFriendsList } from "@/hooks/useFriendship";
import { motion, AnimatePresence } from "framer-motion";
import UserProfileCard from "@/components/community/UserProfileCard";
import SearchFilters from "@/components/community/SearchFilters";
import SearchSuggestions from "@/components/community/SearchSuggestions";

const Community = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discover");
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: friendRequests } = useFriendRequests(user?.id);
  const { data: friends } = useFriendsList(user?.id);

  const hasSearch = searchQuery.trim().length >= 2;
  const hasFilters = !!selectedStream || !!selectedLevel;
  const isSearchActive = hasSearch || hasFilters;

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ["user_search", searchQuery, selectedStream, selectedLevel],
    queryFn: async () => {
      const q = searchQuery.trim().toLowerCase().replace(/[%_\\]/g, "");

      let query = supabase
        .from("profiles")
        .select("id, display_name, avatar_url, computed_level, stream, college, username, bio")
        .neq("id", user!.id);

      if (q.length >= 2) {
        query = query.or(
          `display_name.ilike.%${q}%,username.ilike.%${q}%,stream.ilike.%${q}%,college.ilike.%${q}%,computed_level.ilike.%${q}%`
        );
      }

      if (selectedStream) {
        query = query.ilike("stream", `%${selectedStream}%`);
      }
      if (selectedLevel) {
        query = query.eq("computed_level", selectedLevel);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isSearchActive,
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
          className="space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, username, stream, level..."
              className="pl-9 h-11"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <SearchFilters
            selectedStream={selectedStream}
            selectedLevel={selectedLevel}
            onStreamChange={setSelectedStream}
            onLevelChange={setSelectedLevel}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />

          <SearchSuggestions
            onSuggestionClick={(s) => setSearchQuery(s)}
            visible={!hasSearch && !hasFilters}
          />
        </motion.div>

        {/* Search Results */}
        <AnimatePresence>
          {isSearchActive && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-2"
            >
              <p className="text-xs text-muted-foreground">
                {searching
                  ? "Searching..."
                  : `${searchResults?.length || 0} user${(searchResults?.length || 0) !== 1 ? "s" : ""} found`}
              </p>

              {searching ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-12 w-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !searchResults || searchResults.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center space-y-1">
                      <Search className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="text-sm font-medium">No users found</p>
                      <p className="text-xs text-muted-foreground">Try different keywords or filters</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {searchResults.map((u, i) => (
                    <UserProfileCard
                      key={u.id}
                      user={u}
                      onClick={() => navigate(`/user/${u.id}`)}
                      index={i}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs: Friends / Requests */}
        {!isSearchActive && (
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

              <TabsContent value="discover" className="mt-3 space-y-2">
                {!friends || friends.length === 0 ? (
                  <Card>
                    <CardContent className="py-8">
                      <div className="text-center space-y-2">
                        <UserPlus className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium">No friends yet</p>
                        <p className="text-xs text-muted-foreground">
                          Search for users or visit profiles from the leaderboard to add friends!
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  friends.map((f: any, i: number) => (
                    <UserProfileCard
                      key={f.id}
                      user={f}
                      onClick={() => navigate(`/user/${f.id}`)}
                      showBadge
                      index={i}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="requests" className="mt-3 space-y-2">
                {pendingCount === 0 ? (
                  <Card>
                    <CardContent className="py-8">
                      <div className="text-center space-y-2">
                        <Bell className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium">No pending requests</p>
                        <p className="text-xs text-muted-foreground">
                          Friend requests you receive will appear here
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  (friendRequests || []).map((req: any, i: number) => {
                    const profile = req.profiles || {};
                    return (
                      <UserProfileCard
                        key={req.id}
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
                        index={i}
                      />
                    );
                  })
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default Community;
