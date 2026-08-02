import { supabase } from "@/integrations/supabase/client";

export interface DashboardGoals {
  id: string | null;
  daily_goal: number;
  weekly_goal: number;
  monthly_goal: number;
}

export interface SalesPoint {
  label: string;
  data: string;
  vendas: number;
  pedidos: number;
}

export interface TopProduct {
  name: string;
  quantidade: number;
  total: number;
}

export interface PeriodStats {
  vendas: number;
  pedidos: number;
  ticket: number;
}

export interface DashboardData {
  hoje: PeriodStats;
  ontem: PeriodStats;
  semana: PeriodStats;
  semanaAnterior: PeriodStats;
  mes: PeriodStats;
  mesAnterior: PeriodStats;
  lucroMes: number;
  lucroMesAnterior: number;
  clientesNovos: number;
  clientesRecorrentes: number;
  serie: SalesPoint[];
  topProdutos: TopProduct[];
  statusMes: { status: string; total: number }[];
  estoqueBaixo: { id: string; name: string; quantity: number; min_stock: number; unit: string }[];
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function iso(date: Date) {
  return date.toISOString();
}

function stats(orders: { total: number | null; created_at: string }[]): PeriodStats {
  const vendas = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const pedidos = orders.length;
  return { vendas, pedidos, ticket: pedidos > 0 ? vendas / pedidos : 0 };
}

const STATUS_LABEL: Record<string, string> = {
  recebido: "Recebido",
  preparando: "Preparando",
  saiu_entrega: "Saiu p/ entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const dashboardService = {
  async goals(): Promise<DashboardGoals> {
    const { data, error } = await supabase
      .from("dashboard_goals")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return {
      id: data?.id ?? null,
      daily_goal: Number(data?.daily_goal ?? 0),
      weekly_goal: Number(data?.weekly_goal ?? 0),
      monthly_goal: Number(data?.monthly_goal ?? 0),
    };
  },

  async saveGoals(goals: Omit<DashboardGoals, "id">, id: string | null, companyId: string | null) {
    if (id) {
      const { error } = await supabase.from("dashboard_goals").update(goals).eq("id", id);
      if (error) throw error;
      return;
    }
    const { error } = await supabase
      .from("dashboard_goals")
      .insert({ ...goals, company_id: companyId ?? undefined });
    if (error) throw error;
  },

  async overview(): Promise<DashboardData> {
    const now = new Date();
    const today = startOfDay(now);
    const yesterday = new Date(today.getTime() - 86400000);
    const weekStart = new Date(today.getTime() - 6 * 86400000);
    const prevWeekStart = new Date(today.getTime() - 13 * 86400000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [ordersRes, itemsRes, customersRes, entriesRes, ingredientsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, total, status, created_at, customer_id")
        .gte("created_at", iso(prevMonthStart))
        .neq("status", "cancelado"),
      supabase
        .from("order_items")
        .select("product_name, quantity, line_total, created_at")
        .gte("created_at", iso(monthStart)),
      supabase.from("customers").select("id, created_at"),
      supabase
        .from("financial_entries")
        .select("type, status, amount, due_date")
        .gte("due_date", prevMonthStart.toISOString().slice(0, 10)),
      supabase
        .from("ingredients")
        .select("id, name, quantity, min_stock, unit")
        .eq("is_active", true),
    ]);

    for (const res of [ordersRes, itemsRes, customersRes, entriesRes, ingredientsRes]) {
      if (res.error) throw res.error;
    }

    const orders = (ordersRes.data ?? []) as {
      id: string;
      total: number | null;
      status: string;
      created_at: string;
      customer_id: string | null;
    }[];

    const inRange = (from: Date, to: Date) =>
      orders.filter((order) => {
        const date = new Date(order.created_at);
        return date >= from && date < to;
      });

    const nowDate = new Date(now.getTime() + 1000);
    const monthOrders = inRange(monthStart, nowDate);

    // Série dos últimos 14 dias
    const serie: SalesPoint[] = [];
    for (let index = 13; index >= 0; index -= 1) {
      const day = new Date(today.getTime() - index * 86400000);
      const next = new Date(day.getTime() + 86400000);
      const dayOrders = inRange(day, next);
      serie.push({
        label: day.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        data: day.toISOString().slice(0, 10),
        vendas: dayOrders.reduce((sum, order) => sum + Number(order.total ?? 0), 0),
        pedidos: dayOrders.length,
      });
    }

    // Produtos mais vendidos no mês
    const productMap = new Map<string, TopProduct>();
    for (const item of (itemsRes.data ?? []) as {
      product_name: string;
      quantity: number;
      line_total: number | null;
    }[]) {
      const current = productMap.get(item.product_name) ?? {
        name: item.product_name,
        quantidade: 0,
        total: 0,
      };
      current.quantidade += Number(item.quantity);
      current.total += Number(item.line_total ?? 0);
      productMap.set(item.product_name, current);
    }
    const topProdutos = [...productMap.values()]
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 6);

    // Clientes novos x recorrentes (mês atual)
    const customers = (customersRes.data ?? []) as { id: string; created_at: string }[];
    const clientesNovos = customers.filter(
      (customer) => new Date(customer.created_at) >= monthStart,
    ).length;
    const ordersByCustomer = new Map<string, number>();
    for (const order of orders) {
      if (!order.customer_id) continue;
      ordersByCustomer.set(order.customer_id, (ordersByCustomer.get(order.customer_id) ?? 0) + 1);
    }
    const clientesRecorrentes = [...ordersByCustomer.values()].filter((count) => count > 1).length;

    // Lucro (financeiro)
    const entries = (entriesRes.data ?? []) as {
      type: string;
      status: string;
      amount: number;
      due_date: string;
    }[];
    const profitBetween = (from: Date, to: Date) =>
      entries
        .filter((entry) => {
          if (entry.status === "cancelado") return false;
          const date = new Date(`${entry.due_date}T12:00:00`);
          return date >= from && date < to;
        })
        .reduce(
          (sum, entry) =>
            entry.type === "receita" ? sum + Number(entry.amount) : sum - Number(entry.amount),
          0,
        );

    const statusCount = new Map<string, number>();
    for (const order of monthOrders) {
      statusCount.set(order.status, (statusCount.get(order.status) ?? 0) + 1);
    }

    const ingredients = (ingredientsRes.data ?? []) as {
      id: string;
      name: string;
      quantity: number;
      min_stock: number;
      unit: string;
    }[];

    return {
      hoje: stats(inRange(today, nowDate)),
      ontem: stats(inRange(yesterday, today)),
      semana: stats(inRange(weekStart, nowDate)),
      semanaAnterior: stats(inRange(prevWeekStart, weekStart)),
      mes: stats(monthOrders),
      mesAnterior: stats(inRange(prevMonthStart, monthStart)),
      lucroMes: profitBetween(monthStart, nowDate),
      lucroMesAnterior: profitBetween(prevMonthStart, monthStart),
      clientesNovos,
      clientesRecorrentes,
      serie,
      topProdutos,
      statusMes: [...statusCount.entries()].map(([status, total]) => ({
        status: STATUS_LABEL[status] ?? status,
        total,
      })),
      estoqueBaixo: ingredients
        .filter((item) => Number(item.quantity) <= Number(item.min_stock))
        .sort((a, b) => Number(a.quantity) - Number(b.quantity))
        .slice(0, 8),
    };
  },
};

export function variation(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
