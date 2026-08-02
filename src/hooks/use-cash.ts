import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { cashService } from "@/services/cash.service";
import type { CashSession, CashTransactionInput } from "@/types/cash";

function translate(message: string) {
  if (message.toLowerCase().includes("row-level security")) {
    return "Você não tem permissão para esta ação.";
  }
  if (message.includes("cash_sessions_single_open")) {
    return "Já existe um caixa aberto.";
  }
  return message || "Não foi possível concluir a operação.";
}

export function useCashSessions() {
  return useQuery({ queryKey: ["cash-sessions"], queryFn: () => cashService.listSessions() });
}

export function useCashTransactions(sessionId: string | null) {
  return useQuery({
    queryKey: ["cash-transactions", sessionId],
    queryFn: () => cashService.transactions(sessionId as string),
    enabled: Boolean(sessionId),
  });
}

function useInvalidateCash() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["cash-sessions"] });
    void queryClient.invalidateQueries({ queryKey: ["cash-transactions"] });
  };
}

export function useCashMutations() {
  const { profile } = useAuth();
  const invalidate = useInvalidateCash();
  const companyId = profile?.company_id ?? null;

  const open = useMutation({
    mutationFn: ({ amount, notes }: { amount: number; notes: string | null }) =>
      cashService.open(amount, notes, companyId),
    onSuccess: () => {
      toast.success("Caixa aberto");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  const close = useMutation({
    mutationFn: ({
      session,
      amount,
      notes,
    }: {
      session: CashSession;
      amount: number;
      notes: string | null;
    }) => cashService.close(session, amount, notes),
    onSuccess: () => {
      toast.success("Caixa fechado");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  const addTransaction = useMutation({
    mutationFn: ({ sessionId, input }: { sessionId: string; input: CashTransactionInput }) =>
      cashService.addTransaction(sessionId, input),
    onSuccess: () => {
      toast.success("Movimento registrado");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  const removeTransaction = useMutation({
    mutationFn: (id: string) => cashService.removeTransaction(id),
    onSuccess: () => {
      toast.success("Movimento excluído");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  const autoClose = useMutation({
    mutationFn: () => cashService.autoCloseStale(),
    onSuccess: (closed) => {
      if (closed) {
        toast.info("Caixa do dia anterior fechado automaticamente");
        invalidate();
      }
    },
  });

  return { open, close, addTransaction, removeTransaction, autoClose };
}
