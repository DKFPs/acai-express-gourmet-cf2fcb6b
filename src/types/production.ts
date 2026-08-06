import type { Tables } from "@/integrations/supabase/types";

export type RecipeRow = Tables<"recipes">;
export type RecipeItemRow = Tables<"recipe_items">;
export type PackagingRow = Tables<"packaging_stock">;
export type FinishedProductRow = Tables<"finished_products">;
export type ProductionBatchRow = Tables<"production_batches">;
export type ProductionItemRow = Tables<"production_items">;
export type FinishedMovementRow = Tables<"finished_product_movements">;

export type PackagingType = PackagingRow["type"];
export type FinishedMovementType = FinishedMovementRow["type"];

export interface RecipeItem extends RecipeItemRow {
  ingredient: { id: string; name: string; unit: string; purchase_price: number } | null;
}

export interface Recipe extends RecipeRow {
  category: { id: string; name: string; color: string | null } | null;
  items: RecipeItem[];
}

export interface FinishedProduct extends FinishedProductRow {
  recipe: { id: string; name: string } | null;
}

export interface ProductionBatch extends ProductionBatchRow {
  recipe: { id: string; name: string } | null;
  items: ProductionItemRow[];
}

export interface FinishedMovement extends FinishedMovementRow {
  finished_product: { id: string; name: string } | null;
}

export interface RecipeItemInput {
  ingredient_id: string;
  quantity: number;
  unit: string;
  notes: string | null;
}

export interface RecipeInput {
  name: string;
  category_id: string | null;
  description: string | null;
  bottle_volume_ml: number;
  yield_quantity: number;
  prep_time_minutes: number;
  status: "ativo" | "inativo";
  sale_price: number;
  target_margin_percent: number;
  shelf_life_days: number;
  items: RecipeItemInput[];
}

export interface PackagingInput {
  type: PackagingType;
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  unit_cost: number;
  qty_per_unit: number;
  purchase_quantity: number | null;
  purchase_value: number | null;
  supplier_id: string | null;
  last_purchase_at: string | null;
  next_restock_at: string | null;
  is_active: boolean;
}

export interface ProduceInput {
  recipe_id: string;
  batches: number;
  produced_at: string;
  notes: string | null;
}

export interface FinishedMovementInput {
  finished_product_id: string;
  type: FinishedMovementType;
  quantity: number;
  reason: string | null;
}

export const PACKAGING_LABELS: Record<PackagingType, string> = {
  garrafa: "Garrafinha",
  tampa: "Tampa",
  canudo: "Canudo",
  lacre: "Lacre",
  etiqueta: "Etiqueta",
  outro: "Outro",
};

export const FINISHED_MOVEMENT_LABELS: Record<FinishedMovementType, string> = {
  producao: "Produção",
  venda: "Venda",
  descarte: "Descarte",
  reserva: "Reserva",
  ajuste: "Ajuste",
  estorno: "Estorno",
};

export const PACKAGING_TYPES: PackagingType[] = [
  "garrafa",
  "tampa",
  "canudo",
  "lacre",
  "etiqueta",
  "outro",
];
