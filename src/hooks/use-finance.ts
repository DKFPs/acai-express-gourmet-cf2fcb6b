import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { friendlyError } from "@/lib/errors";

import { useAuth } from "@/hooks/use-auth";
import {
  cashRegisterService,
  expenseCategoryService,
  financeService,
} from "@/services/finance.service";
import type { ExpenseCategoryInput, FinancialEntryInput, FinancialFilters } from "@/types/finance";

export function useFinancialEntries(filters: FinancialFilters) {
  return useQuery({
    queryKey: ["financial-entries", filters],
    queryFn: () => financeService.list(filters),
    placeholderData: (previous) => previous,
  });
}

export function useFinancialRange(from: string, to: string) {
  return useQuery({
    queryKey: ["financial-entries", "range", from, to],
    queryFn: () => financeService.range(from, to),
  });
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: ["expense-categories"],
    queryFn: () => expenseCategoryService.list(),
  });
}

export function useCashRegisters() {
  return useQuery({ queryKey: ["cash-register"], queryFn: () => cashRegisterService.list() });
}

function useInvalidateFinance() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["financial-entries"] });
    void queryClient.invalidateQueries({ queryKey: ["expense-categories"] });
    void queryClient.invalidateQueries({ queryKey: ["cash-register"] });
  };
}

export function useFinancialEntryMutations() {
  const { profile } = useAuth();
  const invalidate = useInvalidateFinance();
  const companyId = profile?.company_id ?? null;

  const create = useMutation({
    mutationFn: (input: FinancialEntryInput) => financeService.create(input, companyId),
    onSuccess: () => {
      toast.success("Lançamento criado");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: FinancialEntryInput }) =>
      financeService.update(id, input),
    onSuccess: () => {
      toast.success("Lançamento atualizado");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const settle = useMutation({
    mutationFn: (id: string) => financeService.settle(id),
    onSuccess: () => {
      toast.success("Conta marcada como paga");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => financeService.remove(id),
    onSuccess: () => {
      toast.success("Lançamento excluído");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return { create, update, settle, remove };
}

export function useExpenseCategoryMutations() {
  const { profile } = useAuth();
  const invalidate = useInvalidateFinance();
  const companyId = profile?.company_id ?? null;

  const create = useMutation({
    mutationFn: (input: ExpenseCategoryInput) => expenseCategoryService.create(input, companyId),
    onSuccess: () => {
      toast.success("Categoria criada");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExpenseCategoryInput }) =>
      expenseCategoryService.update(id, input),
    onSuccess: () => {
      toast.success("Categoria atualizada");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => expenseCategoryService.remove(id),
    onSuccess: () => {
      toast.success("Categoria excluída");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return { create, update, remove };
}

export function useCashRegisterMutations() {
  const { profile } = useAuth();
  const invalidate = useInvalidateFinance();
  const companyId = profile?.company_id ?? null;

  const open = useMutation({
    mutationFn: ({ amount, notes }: { amount: number; notes: string | null }) =>
      cashRegisterService.open(amount, notes, companyId),
    onSuccess: () => {
      toast.success("Caixa aberto");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const close = useMutation({
    mutationFn: ({
      id,
      amount,
      expected,
      notes,
    }: {
      id: string;
      amount: number;
      expected: number;
      notes: string | null;
    }) => cashRegisterService.close(id, amount, expected, notes),
    onSuccess: () => {
      toast.success("Caixa fechado");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return { open, close };
}
