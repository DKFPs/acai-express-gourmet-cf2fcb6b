import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { auditService, type AuditFilters } from "@/services/audit.service";
import { favoriteService } from "@/services/favorite.service";

export function useAuditLogs(filters: AuditFilters) {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;

  return useQuery({
    queryKey: ["audit-logs", companyId, filters],
    queryFn: () => auditService.list(companyId as string, filters),
    enabled: Boolean(companyId),
  });
}

export function useFavorites() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["favorites", userId],
    queryFn: () => favoriteService.list(userId as string),
    enabled: Boolean(userId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["favorites", userId] });

  const toggle = useMutation({
    mutationFn: async ({ label, path }: { label: string; path: string }) => {
      const exists = (query.data ?? []).some((item) => item.path === path);
      if (exists) return favoriteService.remove(userId as string, path);
      return favoriteService.add(userId as string, label, path);
    },
    onSuccess: invalidate,
  });

  return {
    favorites: query.data ?? [],
    isFavorite: (path: string) => (query.data ?? []).some((item) => item.path === path),
    toggle,
  };
}
