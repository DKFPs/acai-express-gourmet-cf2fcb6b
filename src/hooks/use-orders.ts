import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { friendlyError } from "@/lib/errors";

import { useAuth } from "@/hooks/use-auth";
import { customerService, orderService } from "@/services/order.service";
import type {
  CustomerInput,
  OrderFilters,
  OrderInput,
  OrderStatus,
  PaymentStatus,
} from "@/types/order";

export function useOrders(filters: OrderFilters) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () => orderService.list(filters),
    placeholderData: (previous) => previous,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ["orders", "detail", id],
    queryFn: () => orderService.detail(id),
    enabled: Boolean(id),
  });
}

export function useCustomers() {
  return useQuery({ queryKey: ["customers"], queryFn: () => customerService.list() });
}

export function useOrderMutations() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id ?? null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const create = useMutation({
    mutationFn: (input: OrderInput) => orderService.create(input, companyId, user?.id ?? null),
    onSuccess: () => {
      toast.success("Pedido criado com sucesso");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      orderService.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Status atualizado");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const updatePayment = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PaymentStatus }) =>
      orderService.updatePayment(id, status),
    onSuccess: () => {
      toast.success("Pagamento atualizado");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => orderService.remove(id),
    onSuccess: () => {
      toast.success("Pedido excluído");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return { create, updateStatus, updatePayment, remove };
}

export function useCustomerMutations() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (input: CustomerInput) =>
      customerService.create(input, profile?.company_id ?? null),
    onSuccess: () => {
      toast.success("Cliente cadastrado");
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return { create };
}
