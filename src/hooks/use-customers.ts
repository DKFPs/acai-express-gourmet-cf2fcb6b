import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { customerService } from "@/services/customer.service";
import type { CustomerFilters, CustomerInputFull } from "@/types/customer";

export function useCustomerList(filters: CustomerFilters) {
  return useQuery({
    queryKey: ["customers", "list", filters],
    queryFn: () => customerService.list(filters),
    placeholderData: (previous) => previous,
  });
}

export function useCustomerRanking(limit = 5) {
  return useQuery({
    queryKey: ["customers", "ranking", limit],
    queryFn: () => customerService.ranking(limit),
  });
}

export function useCustomerDetail(id: string) {
  return useQuery({
    queryKey: ["customers", "detail", id],
    queryFn: () => customerService.detail(id),
    enabled: Boolean(id),
  });
}

export function useCustomerCrud() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const create = useMutation({
    mutationFn: (input: CustomerInputFull) =>
      customerService.create(input, profile?.company_id ?? null),
    onSuccess: () => {
      toast.success("Cliente cadastrado com sucesso");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CustomerInputFull }) =>
      customerService.update(id, input),
    onSuccess: () => {
      toast.success("Cliente atualizado");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => customerService.remove(id),
    onSuccess: () => {
      toast.success("Cliente excluído");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return { create, update, remove };
}
