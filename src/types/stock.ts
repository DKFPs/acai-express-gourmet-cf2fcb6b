import type { Tables } from "@/integrations/supabase/types";

export type SupplierRow = Tables<"suppliers">;
export type IngredientRow = Tables<"ingredients">;
export type StockMovementRow = Tables<"stock_movements">;

export type MovementType = "entrada" | "saida" | "ajuste";

export interface Ingredient extends IngredientRow {
  supplier: Pick<SupplierRow, "id" | "name"> | null;
  category: { id: string; name: string; color: string | null } | null;
}

export interface StockMovement extends StockMovementRow {
  ingredient: Pick<IngredientRow, "id" | "name" | "unit"> | null;
}

export type StockLevelFilter = "todos" | "critico" | "zerado";

export interface IngredientFilters {
  search: string;
  supplierId: string; // "todos" | uuid
  categoryId: string; // "todas" | uuid
  level: StockLevelFilter;
  page: number;
  pageSize: number;
}

export interface IngredientInput {
  name: string;
  category_id: string | null;
  supplier_id: string | null;
  unit: string;
  quantity: number;
  min_stock: number;
  purchase_price: number;
  last_purchase_quantity: number | null;
  last_purchase_value: number | null;
  last_purchase_at: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface SupplierInput {
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface MovementInput {
  ingredient_id: string;
  type: MovementType;
  quantity: number;
  unit_cost: number;
  reason: string | null;
}

export const UNITS = ["kg", "g", "l", "ml", "un", "cx", "pct"] as const;

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  ajuste: "Ajuste",
};
