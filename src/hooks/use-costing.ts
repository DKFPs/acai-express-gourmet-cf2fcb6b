import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  calculateRecipeCosts,
  toCostingIngredients,
  toCostingPackaging,
  type CostingIngredient,
  type CostingPackaging,
  type CostingRecipeItem,
  type CostingResult,
} from "@/lib/recipe-costing";
import { packagingService } from "@/services/production.service";
import { ingredientService } from "@/services/stock.service";
import type { Recipe } from "@/types/production";

const STALE = 60_000;

/**
 * Fonte única de dados para o motor de custos.
 * Ingredientes e embalagens são carregados uma vez e compartilhados por todas as telas.
 */
export function useCostingData() {
  const ingredientsQuery = useQuery({
    queryKey: ["ingredients", "all"],
    queryFn: () => ingredientService.all(),
    staleTime: STALE,
  });

  const packagingQuery = useQuery({
    queryKey: ["packaging"],
    queryFn: () => packagingService.list(),
    staleTime: STALE,
  });

  const ingredients = useMemo<CostingIngredient[]>(
    () => toCostingIngredients(ingredientsQuery.data ?? []),
    [ingredientsQuery.data],
  );

  const packaging = useMemo<CostingPackaging[]>(
    () => toCostingPackaging(packagingQuery.data ?? []),
    [packagingQuery.data],
  );

  return {
    ingredients,
    packaging,
    isLoading: ingredientsQuery.isLoading || packagingQuery.isLoading,
  };
}

export interface RecipeCostingParams {
  items: CostingRecipeItem[];
  yieldQuantity: number;
  salePrice: number;
  targetMarginPercent: number;
  salesTaxPercent?: number;
  batches?: number;
}

/** Executa o motor central de custos com memoização. */
export function useRecipeCosting(params: RecipeCostingParams): CostingResult {
  const { ingredients, packaging } = useCostingData();
  const {
    items,
    yieldQuantity,
    salePrice,
    targetMarginPercent,
    salesTaxPercent = 0,
    batches = 1,
  } = params;

  return useMemo(
    () =>
      calculateRecipeCosts({
        items,
        ingredients,
        packaging,
        yieldQuantity,
        salePrice,
        targetMarginPercent,
        salesTaxPercent,
        batches,
      }),
    [
      items,
      ingredients,
      packaging,
      yieldQuantity,
      salePrice,
      targetMarginPercent,
      salesTaxPercent,
      batches,
    ],
  );
}

/** Custos de uma receita já salva, sempre pelo motor central. */
export function useSavedRecipeCosting(recipe: Recipe | null, batches = 1): CostingResult {
  const items = useMemo<CostingRecipeItem[]>(
    () =>
      (recipe?.items ?? []).map((item) => ({
        ingredientId: item.ingredient_id,
        quantity: Number(item.quantity),
        unit: item.unit,
      })),
    [recipe],
  );

  return useRecipeCosting({
    items,
    yieldQuantity: Number(recipe?.yield_quantity ?? 0),
    salePrice: Number(recipe?.sale_price ?? 0),
    targetMarginPercent: Number(recipe?.target_margin_percent ?? 40),
    salesTaxPercent: Number(recipe?.sales_tax_percent ?? 0),
    batches,
  });
}
