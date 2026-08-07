import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { friendlyError } from "@/lib/errors";

import { useAuth } from "@/hooks/use-auth";
import {
  finishedProductService,
  packagingService,
  productionService,
  recipeService,
} from "@/services/production.service";
import type {
  FinishedMovementInput,
  PackagingInput,
  ProduceInput,
  RecipeInput,
} from "@/types/production";

export function useRecipes(search = "") {
  return useQuery({
    queryKey: ["recipes", search],
    queryFn: () => recipeService.list(search),
    placeholderData: (previous) => previous,
  });
}

export function usePackaging() {
  return useQuery({ queryKey: ["packaging"], queryFn: () => packagingService.list() });
}

export function useProductionBatches(limit = 100) {
  return useQuery({
    queryKey: ["production-batches", limit],
    queryFn: () => productionService.batches(limit),
  });
}

export function useFinishedProducts() {
  return useQuery({
    queryKey: ["finished-products"],
    queryFn: () => finishedProductService.list(),
  });
}

export function useFinishedMovements(limit = 150) {
  return useQuery({
    queryKey: ["finished-movements", limit],
    queryFn: () => finishedProductService.movements(limit),
  });
}

function useInvalidateProduction() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [
      "recipes",
      "packaging",
      "production-batches",
      "finished-products",
      "finished-movements",
      "ingredients",
      "stock-movements",
    ]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

function useCompanyId() {
  const { profile } = useAuth();
  return profile?.company_id ?? "";
}

export function useRecipeMutations() {
  const companyId = useCompanyId();
  const invalidate = useInvalidateProduction();

  const create = useMutation({
    mutationFn: (input: RecipeInput) => recipeService.create(input, companyId),
    onSuccess: () => {
      toast.success("Receita cadastrada");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: RecipeInput }) =>
      recipeService.update(id, input),
    onSuccess: () => {
      toast.success("Receita atualizada");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => recipeService.remove(id),
    onSuccess: () => {
      toast.success("Receita excluída");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return { create, update, remove };
}

export function usePackagingMutations() {
  const companyId = useCompanyId();
  const invalidate = useInvalidateProduction();

  const create = useMutation({
    mutationFn: (input: PackagingInput) => packagingService.create(input, companyId),
    onSuccess: () => {
      toast.success("Embalagem cadastrada");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: PackagingInput }) =>
      packagingService.update(id, input),
    onSuccess: () => {
      toast.success("Embalagem atualizada");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => packagingService.remove(id),
    onSuccess: () => {
      toast.success("Embalagem excluída");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return { create, update, remove };
}

export function useProduceBatch() {
  const invalidate = useInvalidateProduction();
  return useMutation({
    mutationFn: (input: ProduceInput) => productionService.produce(input),
    onSuccess: () => {
      toast.success("Lote produzido com sucesso");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });
}

export function useFinishedMovementMutations() {
  const companyId = useCompanyId();
  const invalidate = useInvalidateProduction();

  const create = useMutation({
    mutationFn: (input: FinishedMovementInput) =>
      finishedProductService.createMovement(input),
    onSuccess: () => {
      toast.success("Movimentação registrada");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return { create };
}
