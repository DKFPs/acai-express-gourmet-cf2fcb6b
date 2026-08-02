import type { Tables } from "@/integrations/supabase/types";

export type RecipeCostHistoryRow = Tables<"recipe_cost_history">;
export type BatchLabelRow = Tables<"batch_labels">;

export type BatchValidityStatus = "vencido" | "critico" | "atencao" | "ok" | "descartado";

export interface BatchValidity {
  id: string;
  batch_code: string;
  recipe_name: string;
  produced_at: string;
  expires_at: string | null;
  produced_quantity: number;
  discarded_quantity: number;
  remaining: number;
  unit_cost: number;
  days_left: number | null;
  status: BatchValidityStatus;
}

export interface ProductionPoint {
  date: string;
  quantity: number;
  cost: number;
}

export interface RecipePerformance {
  recipe_id: string;
  name: string;
  quantity: number;
  cost: number;
  revenue: number;
  profit: number;
  margin: number;
  batches: number;
}

export interface ProductionOverview {
  today: number;
  week: number;
  month: number;
  costMonth: number;
  profitDay: number;
  profitMonth: number;
  available: number;
  losses: number;
  lossValue: number;
  wastePercent: number;
  series: ProductionPoint[];
  topRecipes: RecipePerformance[];
  mostProfitable: RecipePerformance[];
  leastProfitable: RecipePerformance[];
}

export interface FlavorPerformance {
  name: string;
  quantity: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface CommercialOverview {
  flavors: FlavorPerformance[];
  bestSellers: FlavorPerformance[];
  worstSellers: FlavorPerformance[];
  totalRevenue: number;
  totalProfit: number;
  totalQuantity: number;
}

export interface ProductionAlert {
  id: string;
  kind: "ingrediente" | "embalagem" | "validade" | "prejuizo" | "margem";
  severity: "alta" | "media";
  title: string;
  description: string;
}

export const VALIDITY_LABELS: Record<BatchValidityStatus, string> = {
  vencido: "Vencido",
  critico: "Vence hoje/amanhã",
  atencao: "Próximo do vencimento",
  ok: "Dentro da validade",
  descartado: "Descartado",
};

export function validityStatus(
  expiresAt: string | null,
  remaining: number,
  discardedAll: boolean,
): { status: BatchValidityStatus; daysLeft: number | null } {
  if (discardedAll || remaining <= 0) return { status: "descartado", daysLeft: null };
  if (!expiresAt) return { status: "ok", daysLeft: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${expiresAt}T00:00:00`);
  const daysLeft = Math.round((expiry.getTime() - today.getTime()) / 86_400_000);
  if (daysLeft < 0) return { status: "vencido", daysLeft };
  if (daysLeft <= 1) return { status: "critico", daysLeft };
  if (daysLeft <= 3) return { status: "atencao", daysLeft };
  return { status: "ok", daysLeft };
}
