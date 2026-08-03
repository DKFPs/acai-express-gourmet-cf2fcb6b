export type SuggestionTone = "positive" | "warning" | "critical" | "info";

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  tone: SuggestionTone;
  to?: string;
}

export interface FlavorStat {
  name: string;
  quantidade: number;
  faturamento: number;
  lucro: number;
}

export interface MarginStat {
  name: string;
  margem: number;
  preco: number;
  custo: number;
}

export interface HourStat {
  hora: string;
  faturamento: number;
  pedidos: number;
}

export interface WeekdayStat {
  dia: string;
  faturamento: number;
  pedidos: number;
}

export interface CustomerStat {
  name: string;
  total: number;
  pedidos: number;
}

export interface IngredientCostStat {
  name: string;
  custo: number;
}

export interface StockProjection {
  name: string;
  tipo: "ingrediente" | "embalagem";
  quantidade: number;
  unidade: string;
  consumoDiario: number;
  diasRestantes: number | null;
}

export interface TrendPoint {
  label: string;
  receita: number;
  custo: number;
  lucro: number;
}

export interface IntelligenceData {
  dias: number;
  faturamento: number;
  lucro: number;
  lucroAnterior: number;
  pedidos: number;
  sabores: FlavorStat[];
  saboresAnterior: FlavorStat[];
  horas: HourStat[];
  semana: WeekdayStat[];
  clientes: CustomerStat[];
  margens: MarginStat[];
  ingredientes: IngredientCostStat[];
  projecoes: StockProjection[];
  tendencia: TrendPoint[];
  lotesVencendo: { name: string; batch_code: string | null; expires_at: string; dias: number }[];
  prontos: { recipe_id: string | null; name: string; disponivel: number }[];
}
