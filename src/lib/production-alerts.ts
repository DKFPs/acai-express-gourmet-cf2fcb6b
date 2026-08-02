import type { Ingredient } from "@/types/stock";
import type { BatchValidity, ProductionAlert } from "@/types/production-advanced";
import type { PackagingRow, Recipe } from "@/types/production";
import { formatCurrency } from "@/lib/format";

const MIN_MARGIN = 40;

export function buildProductionAlerts(params: {
  ingredients: Ingredient[];
  packaging: PackagingRow[];
  recipes: Recipe[];
  validity: BatchValidity[];
}): ProductionAlert[] {
  const alerts: ProductionAlert[] = [];

  for (const ingredient of params.ingredients) {
    if (Number(ingredient.quantity) <= Number(ingredient.min_stock)) {
      alerts.push({
        id: `ing-${ingredient.id}`,
        kind: "ingrediente",
        severity: Number(ingredient.quantity) <= 0 ? "alta" : "media",
        title: `Ingrediente acabando: ${ingredient.name}`,
        description: `Restam ${Number(ingredient.quantity)} ${ingredient.unit} (mínimo ${Number(ingredient.min_stock)}).`,
      });
    }
  }

  for (const item of params.packaging) {
    if (item.is_active && Number(item.quantity) <= Number(item.min_stock)) {
      alerts.push({
        id: `pack-${item.id}`,
        kind: "embalagem",
        severity: Number(item.quantity) <= 0 ? "alta" : "media",
        title: `Embalagem acabando: ${item.name}`,
        description: `Restam ${Number(item.quantity)} ${item.unit} (mínimo ${Number(item.min_stock)}).`,
      });
    }
  }

  for (const batch of params.validity) {
    if (batch.status === "vencido") {
      alerts.push({
        id: `val-${batch.id}`,
        kind: "validade",
        severity: "alta",
        title: `Lote vencido: ${batch.batch_code}`,
        description: `${batch.recipe_name} — ${batch.remaining} un venceram em ${batch.expires_at ?? "—"}.`,
      });
    } else if (batch.status === "critico" || batch.status === "atencao") {
      alerts.push({
        id: `val-${batch.id}`,
        kind: "validade",
        severity: batch.status === "critico" ? "alta" : "media",
        title: `Lote perto do vencimento: ${batch.batch_code}`,
        description: `${batch.recipe_name} — ${batch.remaining} un vencem em ${batch.days_left} dia(s).`,
      });
    }
  }

  for (const recipe of params.recipes) {
    const salePrice = Number(recipe.sale_price ?? 0);
    const cost = Number(recipe.cost_per_unit ?? 0);
    const margin = Number(recipe.margin_percent ?? 0);
    if (salePrice > 0 && salePrice < cost) {
      alerts.push({
        id: `loss-${recipe.id}`,
        kind: "prejuizo",
        severity: "alta",
        title: `Prejuízo em ${recipe.name}`,
        description: `Custo ${formatCurrency(cost)} acima do preço de venda ${formatCurrency(salePrice)}.`,
      });
    } else if (salePrice > 0 && margin < MIN_MARGIN) {
      alerts.push({
        id: `margin-${recipe.id}`,
        kind: "margem",
        severity: "media",
        title: `Margem baixa em ${recipe.name}`,
        description: `Margem atual de ${margin.toFixed(1)}% — abaixo do mínimo de ${MIN_MARGIN}%. Preço mínimo sugerido: ${formatCurrency(Number(recipe.min_sale_price ?? 0))}.`,
      });
    }
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "alta" ? -1 : 1));
}
