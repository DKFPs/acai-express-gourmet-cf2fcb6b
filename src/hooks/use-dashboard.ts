import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { dashboardService, type DashboardGoals } from "@/services/dashboard.service";

export function useDashboardOverview() {
  return useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => dashboardService.overview(),
    refetchInterval: 60_000,
  });
}

export function useDashboardGoals() {
  return useQuery({ queryKey: ["dashboard", "goals"], queryFn: () => dashboardService.goals() });
}

export function useGoalsMutation() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: ({ goals, id }: { goals: Omit<DashboardGoals, "id">; id: string | null }) =>
      dashboardService.saveGoals(goals, id, profile?.company_id ?? null),
    onSuccess: () => {
      toast.success("Metas atualizadas");
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) =>
      toast.error(
        error.message.toLowerCase().includes("row-level security")
          ? "Apenas administradores podem alterar as metas."
          : error.message,
      ),
  });
}

/** Atualização em tempo real: recarrega o painel quando pedidos/clientes/estoque mudam. */
export function useDashboardRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "ingredients" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
