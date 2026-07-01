import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { enqueue } from "@/lib/offlineQueue";

const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  const key = ["notifications", userId];

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as Notification[];
    },
    enabled: !!userId,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Optimistic: instantly mark read in cache, then reconcile with server.
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      if (isOffline()) {
        enqueue({ type: "notification_read", notificationId });
        return;
      }
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as { read: boolean })
        .eq("id", notificationId);
      if (error) throw error;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Notification[]>(key);
      queryClient.setQueryData<Notification[]>(key, (old) =>
        (old || []).map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true } as { read: boolean })
        .eq("user_id", userId!)
        .eq("read", false);
      if (error) throw error;
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Notification[]>(key);
      queryClient.setQueryData<Notification[]>(key, (old) =>
        (old || []).map((n) => ({ ...n, read: true }))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      if (isOffline()) {
        enqueue({ type: "notification_delete", notificationId });
        return;
      }
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);
      if (error) throw error;
    },
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Notification[]>(key);
      queryClient.setQueryData<Notification[]>(key, (old) =>
        (old || []).filter((n) => n.id !== notificationId)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  // NOTE: Realtime subscription lives in useRealtimeNotifications (mounted
  // globally in App.tsx). We do NOT open a second channel here — that would
  // double invalidations and risk Supabase connection limits.

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    deleteNotification: deleteNotification.mutate,
  };
}
