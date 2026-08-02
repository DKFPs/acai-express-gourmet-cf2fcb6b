import type { FinancialEntry, FinancialType } from "@/types/finance";

export interface FinanceSummary {
  receitas: number;
  despesas: number;
  compras: number;
  investimentos: number;
  saidas: number;
  lucro: number;
  margem: number;
  pagas: number;
  pendentes: number;
  pendentesCount: number;
  vencidas: number;
}

const ACTIVE = (entry: FinancialEntry) => entry.status !== "cancelado";

export function summarize(entries: FinancialEntry[]): FinanceSummary {
  const sumBy = (type: FinancialType) =>
    entries
      .filter((entry) => ACTIVE(entry) && entry.type === type)
      .reduce((total, entry) => total + Number(entry.amount), 0);

  const receitas = sumBy("receita");
  const despesas = sumBy("despesa");
  const compras = sumBy("compra");
  const investimentos = sumBy("investimento");
  const saidas = despesas + compras + investimentos;
  const lucro = receitas - saidas;

  const today = new Date().toISOString().slice(0, 10);
  const pending = entries.filter((entry) => entry.status === "pendente");

  return {
    receitas,
    despesas,
    compras,
    investimentos,
    saidas,
    lucro,
    margem: receitas > 0 ? Math.round((lucro / receitas) * 10000) / 100 : 0,
    pagas: entries
      .filter((entry) => entry.status === "pago")
      .reduce((total, entry) => total + Number(entry.amount), 0),
    pendentes: pending.reduce((total, entry) => total + Number(entry.amount), 0),
    pendentesCount: pending.length,
    vencidas: pending.filter((entry) => entry.due_date < today).length,
  };
}

export interface DailyPoint {
  dia: string;
  data: string;
  receitas: number;
  saidas: number;
  lucro: number;
}

/** Lucro diário no período informado. */
export function dailySeries(entries: FinancialEntry[]): DailyPoint[] {
  const map = new Map<string, DailyPoint>();
  for (const entry of entries) {
    if (!ACTIVE(entry)) continue;
    const key = entry.due_date;
    const [, month, day] = key.split("-");
    const point =
      map.get(key) ??
      ({ dia: `${day}/${month}`, data: key, receitas: 0, saidas: 0, lucro: 0 } as DailyPoint);
    if (entry.type === "receita") point.receitas += Number(entry.amount);
    else point.saidas += Number(entry.amount);
    point.lucro = point.receitas - point.saidas;
    map.set(key, point);
  }
  return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
}

export interface MonthlyPoint {
  mes: string;
  data: string;
  receitas: number;
  saidas: number;
  lucro: number;
  margem: number;
}

/** Lucro mensal e margem por mês. */
export function monthlySeries(entries: FinancialEntry[]): MonthlyPoint[] {
  const map = new Map<string, MonthlyPoint>();
  for (const entry of entries) {
    if (!ACTIVE(entry)) continue;
    const key = entry.due_date.slice(0, 7);
    const [year = "", month = ""] = key.split("-");
    const point =
      map.get(key) ??
      ({ mes: `${month}/${year.slice(2)}`, data: key, receitas: 0, saidas: 0, lucro: 0, margem: 0 } as MonthlyPoint);
    if (entry.type === "receita") point.receitas += Number(entry.amount);
    else point.saidas += Number(entry.amount);
    point.lucro = point.receitas - point.saidas;
    point.margem = point.receitas > 0 ? Math.round((point.lucro / point.receitas) * 10000) / 100 : 0;
    map.set(key, point);
  }
  return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
}

export interface CategorySlice {
  nome: string;
  valor: number;
  cor: string;
}

const FALLBACK_COLORS = ["#6D28D9", "#D4AF37", "#22C55E", "#EF4444", "#3B82F6", "#EC4899", "#F97316"];

/** Distribuição de saídas por categoria. */
export function categoryBreakdown(entries: FinancialEntry[]): CategorySlice[] {
  const map = new Map<string, CategorySlice>();
  let index = 0;
  for (const entry of entries) {
    if (!ACTIVE(entry) || entry.type === "receita") continue;
    const name = entry.category?.name ?? "Sem categoria";
    const slice =
      map.get(name) ??
      ({
        nome: name,
        valor: 0,
        cor: entry.category?.color ?? FALLBACK_COLORS[index++ % FALLBACK_COLORS.length],
      } as CategorySlice);
    slice.valor += Number(entry.amount);
    map.set(name, slice);
  }
  return Array.from(map.values()).sort((a, b) => b.valor - a.valor);
}

/** Fluxo de caixa acumulado (somente lançamentos pagos). */
export function cashFlowSeries(entries: FinancialEntry[]) {
  const paid = entries.filter((entry) => entry.status === "pago");
  const daily = dailySeries(paid);
  let balance = 0;
  return daily.map((point) => {
    balance += point.lucro;
    return { ...point, saldo: Math.round(balance * 100) / 100 };
  });
}
