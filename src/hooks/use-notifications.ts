import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { notificationService } from "@/services/notification.service";
import type { NotificationRow } from "@/types/saas";

export function useNotifications() {
  const { profile, user } = useAuth();
  const companyId = profile?.company_id ?? null;
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", companyId],
    queryFn: () => notificationService.list(companyId as string),
    enabled: Boolean(companyId),
  });

  useEffect(() => {
    if (!companyId) return;
    const channel = supabase
      .channel(`notifications-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          toast(row.title, { description: row.message ?? undefined });
          void queryClient.invalidateQueries({ queryKey: ["notifications", companyId] });
          void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  const items = query.data ?? [];
  const unread = userId ? items.filter((item) => !item.read_by.includes(userId)) : [];

  const markRead = useMutation({
    mutationFn: (item: NotificationRow) => notificationService.markRead(item, userId as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", companyId] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationService.markAllRead(items, userId as string),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", companyId] }),
  });

  return { items, unread, isLoading: query.isLoading, markRead, markAllRead };
}
