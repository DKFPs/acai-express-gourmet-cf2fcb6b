export type ReportKind =
  "vendas" | "financeiro" | "lucro" | "clientes" | "produtos" | "estoque" | "fluxo-caixa";

export const REPORT_KINDS: { value: ReportKind; label: string; description: string }[] = [
  { value: "vendas", label: "Vendas", description: "Pedidos, ticket médio e formas de pagamento" },
  {
    value: "financeiro",
    label: "Financeiro",
    description: "Receitas, despesas, compras e pendências",
  },
  { value: "lucro", label: "Lucro", description: "Resultado e margem por mês" },
  { value: "clientes", label: "Clientes", description: "Compras, gasto total e recorrência" },
  { value: "produtos", label: "Produtos", description: "Mais vendidos, faturamento e lucro" },
  { value: "estoque", label: "Estoque", description: "Saldo, mínimo e valor imobilizado" },
  {
    value: "fluxo-caixa",
    label: "Fluxo de Caixa",
    description: "Sessões de caixa, entradas e sangrias",
  },
];

export type ValueFormat = "currency" | "number" | "percent" | "text" | "date" | "datetime";

export interface ReportKpi {
  label: string;
  value: number | string;
  format: ValueFormat;
  hint?: string;
}

export interface ReportColumn {
  key: string;
  label: string;
  format: ValueFormat;
}

export type ReportRow = Record<string, string | number | null>;

export interface ChartSeries {
  key: string;
  label: string;
  color: string;
}

export interface ReportChart {
  id: string;
  title: string;
  type: "area" | "bar" | "line" | "pie";
  xKey: string;
  data: Record<string, string | number>[];
  series: ChartSeries[];
}

export interface ReportResult {
  kind: ReportKind;
  title: string;
  kpis: ReportKpi[];
  columns: ReportColumn[];
  rows: ReportRow[];
  charts: ReportChart[];
}

export interface ReportPeriod {
  from: string; // yyyy-mm-dd
  to: string; // yyyy-mm-dd
}

export const CHART_COLORS = [
  "#6D28D9",
  "#D4AF37",
  "#22C55E",
  "#EF4444",
  "#3B82F6",
  "#EC4899",
  "#F97316",
  "#14B8A6",
];

export function periodLabel(period: ReportPeriod) {
  const fmt = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
  return `${fmt(period.from)} a ${fmt(period.to)}`;
}

export function presetPeriod(preset: string): ReportPeriod {
  const today = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const shift = (days: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - days);
    return date;
  };
  switch (preset) {
    case "hoje":
      return { from: iso(today), to: iso(today) };
    case "7":
      return { from: iso(shift(6)), to: iso(today) };
    case "30":
      return { from: iso(shift(29)), to: iso(today) };
    case "mes":
      return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
    case "ano":
      return { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today) };
    default:
      return { from: iso(shift(29)), to: iso(today) };
  }
}
