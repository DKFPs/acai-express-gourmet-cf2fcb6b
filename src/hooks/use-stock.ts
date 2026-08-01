import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { ingredientService, movementService, supplierService } from "@/services/stock.service";
import type {
  IngredientFilters,
  IngredientInput,
  MovementInput,
  SupplierInput,
} from "@/types/stock";

function translate(message: string) {
  if (message.toLowerCase().includes("row-level security")) {
    return "Você não tem permissão para esta ação.";
  }
  if (message.includes("violates foreign key")) {
    return "Registro em uso por outro cadastro.";
  }
  return message || "Não foi possível concluir a operação.";
}

export function useIngredients(filters: IngredientFilters) {
  return useQuery({
    queryKey: ["ingredients", filters],
    queryFn: () => ingredientService.list(filters),
    placeholderData: (previous) => previous,
  });
}

export function useAllIngredients() {
  return useQuery({ queryKey: ["ingredients", "all"], queryFn: () => ingredientService.all() });
}

export function useSuppliers() {
  return useQuery({ queryKey: ["suppliers"], queryFn: () => supplierService.list() });
}

export function useMovements(params: { ingredientId?: string; type?: string; limit?: number }) {
  return useQuery({
    queryKey: ["stock-movements", params],
    queryFn: () => movementService.list(params),
  });
}

function useInvalidateStock() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ["ingredients"] });
    void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
    void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
  };
}

export function useIngredientMutations() {
  const { profile } = useAuth();
  const invalidate = useInvalidateStock();
  const companyId = profile?.company_id ?? null;

  const create = useMutation({
    mutationFn: (input: IngredientInput) => ingredientService.create(input, companyId),
    onSuccess: () => {
      toast.success("Ingrediente cadastrado");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: IngredientInput }) =>
      ingredientService.update(id, input),
    onSuccess: () => {
      toast.success("Ingrediente atualizado");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => ingredientService.remove(id),
    onSuccess: () => {
      toast.success("Ingrediente excluído");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  return { create, update, remove };
}

export function useSupplierMutations() {
  const { profile } = useAuth();
  const invalidate = useInvalidateStock();
  const companyId = profile?.company_id ?? null;

  const create = useMutation({
    mutationFn: (input: SupplierInput) => supplierService.create(input, companyId),
    onSuccess: () => {
      toast.success("Fornecedor cadastrado");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: SupplierInput }) =>
      supplierService.update(id, input),
    onSuccess: () => {
      toast.success("Fornecedor atualizado");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => supplierService.remove(id),
    onSuccess: () => {
      toast.success("Fornecedor excluído");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  return { create, update, remove };
}

export function useMovementMutations() {
  const { profile } = useAuth();
  const invalidate = useInvalidateStock();
  const companyId = profile?.company_id ?? null;

  const create = useMutation({
    mutationFn: (input: MovementInput) => movementService.create(input, companyId),
    onSuccess: () => {
      toast.success("Movimentação registrada");
      invalidate();
    },
    onError: (error: Error) => toast.error(translate(error.message)),
  });

  return { create };
}
