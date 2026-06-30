import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Search } from "lucide-react";
import { format } from "date-fns";

interface AdminProfile {
  id: string;
  display_name?: string | null;
  username?: string | null;
}

interface AuditLog {
  id: string;
  event: string;
  actor_user_id: string | null;
  target_user_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const AuditLogsSection = ({ profiles }: { profiles: AdminProfile[] }) => {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as AuditLog[];
    },
  });

  const nameOf = (id: string | null) => {
    if (!id) return "—";
    const p = profiles.find((x) => x.id === id);
    return p?.display_name || p?.username || id.slice(0, 8);
  };

  const eventTypes = useMemo(() => {
    const set = new Set(logs.map((l) => l.event));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = logs.filter((l) => {
    if (eventFilter !== "all" && l.event !== eventFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.event.toLowerCase().includes(q) ||
      nameOf(l.actor_user_id).toLowerCase().includes(q) ||
      nameOf(l.target_user_id).toLowerCase().includes(q) ||
      (l.ip_address || "").toLowerCase().includes(q)
    );
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-muted-foreground" />
          Audit Logs
          <Badge variant="secondary" className="ml-2">{filtered.length}</Badge>
        </CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search event, actor, target, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {eventTypes.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8 text-sm">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No audit logs match your filters.</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filtered.map((l) => (
              <div key={l.id} className="border rounded-md p-3 text-sm space-y-1.5 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-[10px]">{l.event}</Badge>
                  <span className="text-xs text-muted-foreground">{format(new Date(l.created_at), "MMM dd, yyyy HH:mm:ss")}</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-1 text-xs">
                  <div><span className="text-muted-foreground">Actor:</span> <span className="font-medium">{nameOf(l.actor_user_id)}</span></div>
                  <div><span className="text-muted-foreground">Target:</span> <span className="font-medium">{nameOf(l.target_user_id)}</span></div>
                  {l.ip_address && <div><span className="text-muted-foreground">IP:</span> <span className="font-mono">{l.ip_address}</span></div>}
                  {l.user_agent && <div className="truncate" title={l.user_agent}><span className="text-muted-foreground">UA:</span> {l.user_agent}</div>}
                </div>
                {l.metadata && Object.keys(l.metadata).length > 0 && (
                  <pre className="text-[10px] bg-muted/60 rounded p-2 overflow-x-auto mt-1">{JSON.stringify(l.metadata, null, 2)}</pre>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditLogsSection;
