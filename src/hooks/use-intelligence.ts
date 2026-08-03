import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { intelligenceService } from "@/services/intelligence.service";

export function useIntelligence(days: number) {
  return useQuery({
    queryKey: ["intelligence", days],
    queryFn: () => intelligenceService.analyze(days),
    refetchInterval: 60_000,
  });
}

/** Atualiza a análise em tempo real quando vendas ou estoque mudam. */
export function useIntelligenceRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["intelligence"] });
    };

    const channel = supabase
      .channel("intelligence-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "ingredients" }, invalidate)
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
