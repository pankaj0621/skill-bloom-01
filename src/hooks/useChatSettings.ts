import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ChatSettings {
  disappear_seconds: number | null;
}

export function useChatSettings(userId: string | undefined, peerId: string | null) {
  const queryClient = useQueryClient();
  const key = ["peer_chat_settings", userId, peerId];

  const query = useQuery<ChatSettings>({
    queryKey: key,
    queryFn: async () => {
      if (!userId || !peerId) return { disappear_seconds: null };
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (k: string, v: string) => {
              eq: (k: string, v: string) => {
                maybeSingle: () => Promise<{ data: { disappear_seconds: number | null } | null; error: unknown }>;
              };
            };
          };
        };
      })
        .from("peer_chat_settings")
        .select("disappear_seconds")
        .eq("user_id", userId)
        .eq("peer_id", peerId)
        .maybeSingle();
      if (error) throw error;
      return { disappear_seconds: data?.disappear_seconds ?? null };
    },
    enabled: !!userId && !!peerId,
    staleTime: 60_000,
  });

  const update = useMutation({
    mutationFn: async (disappearSeconds: number | null) => {
      if (!userId || !peerId) throw new Error("No chat");
      const { error } = await (supabase as unknown as {
        from: (t: string) => {
          upsert: (v: Record<string, unknown>, o: { onConflict: string }) => Promise<{ error: unknown }>;
        };
      })
        .from("peer_chat_settings")
        .upsert(
          { user_id: userId, peer_id: peerId, disappear_seconds: disappearSeconds, updated_at: new Date().toISOString() },
          { onConflict: "user_id,peer_id" }
        );
      if (error) throw error as Error;
    },
    onSuccess: (_d, disappearSeconds) => {
      queryClient.setQueryData<ChatSettings>(key, { disappear_seconds: disappearSeconds });
      toast.success(disappearSeconds ? "Disappearing messages turned on" : "Disappearing messages turned off");
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update"),
  });

  return { settings: query.data, updateDisappear: update };
}
