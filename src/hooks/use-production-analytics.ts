import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { productionAnalyticsService } from "@/services/production-analytics.service";

const PRODUCTION_KEYS = [
  ["production-overview"],
  ["production-validity"],
  ["production-commercial"],
  ["production-batches"],
  ["finished-products"],
  ["finished-movements"],
  ["batch-labels"],
  ["recipes"],
  ["recipe-cost-history"],
];

export function useProductionOverview(days = 60) {
  return useQuery({
    queryKey: ["production-overview", days],
    queryFn: () => productionAnalyticsService.overview(days),
    staleTime: 30_000,
  });
}

export function useProductionValidity(days = 120) {
  return useQuery({
    queryKey: ["production-validity", days],
    queryFn: () => productionAnalyticsService.validity(days),
    staleTime: 30_000,
  });
}

export function useCommercialOverview(days = 30) {
  return useQuery({
    queryKey: ["production-commercial", days],
    queryFn: () => productionAnalyticsService.commercial(days),
    staleTime: 30_000,
  });
}

export function useRecipeCostHistory(recipeId?: string) {
  return useQuery({
    queryKey: ["recipe-cost-history", recipeId ?? "all"],
    queryFn: () => productionAnalyticsService.costHistory(recipeId),
  });
}

export function useBatchLabels(limit = 60) {
  return useQuery({
    queryKey: ["batch-labels", limit],
    queryFn: () => productionAnalyticsService.labels(limit),
  });
}

export function useBatchDetail(batchId: string) {
  return useQuery({
    queryKey: ["batch-detail", batchId],
    queryFn: () => productionAnalyticsService.batchDetail(batchId),
    enabled: Boolean(batchId),
  });
}

export function useDiscardBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      batchId,
      quantity,
      reason,
    }: {
      batchId: string;
      quantity: number | null;
      reason: string;
    }) => productionAnalyticsService.discardBatch(batchId, quantity, reason),
    onSuccess: () => {
      toast.success("Descarte registrado e perda contabilizada");
      for (const key of PRODUCTION_KEYS) void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (error: Error) =>
      toast.error(
        error.message.toLowerCase().includes("row-level security")
          ? "Você não tem permissão para descartar lotes."
          : error.message,
      ),
  });
}

/** Mantém os painéis de produção sincronizados em tempo real. */
export function useProductionRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      for (const key of PRODUCTION_KEYS) void queryClient.invalidateQueries({ queryKey: key });
    };

    const channel = supabase
      .channel("production-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "production_batches" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "finished_products" }, invalidate)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "finished_product_movements" },
        invalidate,
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes" }, invalidate)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
