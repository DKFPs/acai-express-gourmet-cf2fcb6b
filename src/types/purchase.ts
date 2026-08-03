import type { Tables } from "@/integrations/supabase/types";

export type PurchaseRow = Tables<"purchases">;
export type PurchaseKind = PurchaseRow["kind"];

export interface Purchase extends PurchaseRow {
  supplier: { id: string; name: string } | null;
  category: { id: string; name: string; color: string | null } | null;
}

export interface PurchaseInput {
  supplier_id: string | null;
  supplier_name: string | null;
  kind: PurchaseKind;
  ingredient_id: string | null;
  packaging_id: string | null;
  category_id: string | null;
  item_name: string;
  quantity: number;
  unit: string;
  total_value: number;
  unit_cost: number;
  purchase_date: string;
  notes: string | null;
}

export interface PurchaseFilters {
  search: string;
  supplierId: string; // "todos" | uuid
  kind: "todos" | PurchaseKind;
  from: string; // yyyy-mm-dd
  to: string;
}

export const PURCHASE_KIND_LABELS: Record<PurchaseKind, string> = {
  ingrediente: "Ingrediente",
  embalagem: "Embalagem",
};

export interface PurchaseIndicators {
  monthTotal: number;
  monthCount: number;
  topSupplier: { name: string; total: number } | null;
  topItem: { name: string; quantity: number; unit: string } | null;
}
