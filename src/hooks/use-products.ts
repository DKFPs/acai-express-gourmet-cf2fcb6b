import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { friendlyError } from "@/lib/errors";

import { useAuth } from "@/hooks/use-auth";
import { categoryService, productService } from "@/services/product.service";
import type { CategoryInput, ProductFilters, ProductInput, ProductRow } from "@/types/product";

export function useProducts(filters: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => productService.list(filters),
    placeholderData: (previous) => previous,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.list(),
  });
}

function useInvalidateProducts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["products"] });
}

export function useProductMutations() {
  const { profile } = useAuth();
  const invalidate = useInvalidateProducts();
  const companyId = profile?.company_id ?? null;

  const create = useMutation({
    mutationFn: (input: ProductInput) => productService.create(input, companyId),
    onSuccess: () => {
      toast.success("Produto criado com sucesso");
      void invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ProductInput }) =>
      productService.update(id, input),
    onSuccess: () => {
      toast.success("Produto atualizado");
      void invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const remove = useMutation({
    mutationFn: (product: Pick<ProductRow, "id" | "image_url">) => productService.remove(product),
    onSuccess: () => {
      toast.success("Produto excluído");
      void invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return { create, update, remove };
}

export function useCategoryMutations() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id ?? null;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["categories"] });
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  };

  const create = useMutation({
    mutationFn: (input: CategoryInput) => categoryService.create(input, companyId),
    onSuccess: () => {
      toast.success("Categoria criada");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CategoryInput> }) =>
      categoryService.update(id, input),
    onSuccess: () => {
      toast.success("Categoria atualizada");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  const remove = useMutation({
    mutationFn: (id: string) => categoryService.remove(id),
    onSuccess: () => {
      toast.success("Categoria excluída");
      invalidate();
    },
    onError: (error: Error) => toast.error(friendlyError(error)),
  });

  return { create, update, remove };
}
