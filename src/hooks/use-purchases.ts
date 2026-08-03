import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { purchaseService } from "@/services/purchase.service";
import type { PurchaseFilters, PurchaseInput } from "@/types/purchase";

function translate(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("row-level security")) return "Você não tem permissão para esta ação.";
  if (lower.includes("violates foreign key")) return "Registro em uso por outro cadastro.";
  return message || "Não foi possível concluir a operação.";
}

export function usePurchases(filters: PurchaseFilters) {
  return useQuery({
    queryKey: ["purchases", filters],
    queryFn: () => purchaseService.list(filters),
    placeholderData: (previous) => previous,
  });
}

function useInvalidatePurchases() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      "purchases",
      "ingredients",
      "stock-movements",
      "packaging",
      "recipes",
      "suppliers",
    ]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function usePurchaseMutations() {
  const { profile } = useAuth();
  const invalidate = useInvalidatePurchases();
  const companyId = profile?.company_id ?? "";

  const create = useMutation({
    mutationFn: (input: PurchaseInput) => purchaseService.create(input, companyId),
    onSuccess: () => {
      toast.success("Compra registrada e estoque atualizado");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => purchaseService.remove(id),
    onSuccess: () => {
      toast.success("Compra excluída");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  return { create, remove };
}
