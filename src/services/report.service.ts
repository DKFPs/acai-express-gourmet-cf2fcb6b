import { supabase } from "@/integrations/supabase/client";
import {
  CHART_COLORS,
  type ReportChart,
  type ReportKind,
  type ReportPeriod,
  type ReportResult,
  type ReportRow,
} from "@/types/report";

const sel = (value: string): string => value;

function startOf(period: ReportPeriod) {
  return `${period.from}T00:00:00`;
}
function endOf(period: ReportPeriod) {
  return `${period.to}T23:59:59`;
}
function dayLabel(iso: string) {
  const [, month = "", day = ""] = iso.slice(0, 10).split("-");
  return `${day}/${month}`;
}
function round(value: number) {
  return Math.round(value * 100) / 100;
}

interface OrderReportRow {
  order_number: number;
  created_at: string;
  customer_name: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  customer_id: string | null;
}

async function fetchOrders(period: ReportPeriod): Promise<OrderReportRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(
      sel(
        "order_number, created_at, customer_name, customer_id, status, payment_method, payment_status, subtotal, delivery_fee, discount, total",
      ),
    )
    .gte("created_at", startOf(period))
    .lte("created_at", endOf(period))
    .order("created_at", { ascending: true })
    .returns<OrderReportRow[]>();
  if (error) throw error;
  return data ?? [];
}

function groupSum<T>(items: T[], keyOf: (item: T) => string, valueOf: (item: T) => number) {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    map.set(key, (map.get(key) ?? 0) + valueOf(item));
  }
  return map;
}

function pieChart(id: string, title: string, map: Map<string, number>): ReportChart {
  return {
    id,
    title,
    type: "pie",
    xKey: "nome",
    data: Array.from(map.entries())
      .map(([nome, valor], index) => ({ nome, valor: round(valor), fill: CHART_COLORS[index % CHART_COLORS.length]! }))
      .sort((a, b) => b.valor - a.valor),
    series: [{ key: "valor", label: "Valor", color: CHART_COLORS[0]! }],
  };
}

async function vendas(period: ReportPeriod): Promise<ReportResult> {
  const orders = (await fetchOrders(period)).filter((order) => order.status !== "cancelado");
  const total = orders.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
  const daily = groupSum(orders, (order) => order.created_at.slice(0, 10), (order) => Number(order.total ?? 0));
  const counts = groupSum(orders, (order) => order.created_at.slice(0, 10), () => 1);
  const byMethod = groupSum(orders, (order) => order.payment_method, (order) => Number(order.total ?? 0));

  return {
    kind: "vendas",
    title: "Relatório de Vendas",
    kpis: [
      { label: "Faturamento", value: round(total), format: "currency" },
      { label: "Pedidos", value: orders.length, format: "number" },
      { label: "Ticket médio", value: orders.length ? round(total / orders.length) : 0, format: "currency" },
      {
        label: "Entregas",
        value: round(orders.reduce((sum, order) => sum + Number(order.delivery_fee ?? 0), 0)),
        format: "currency",
      },
    ],
    columns: [
      { key: "numero", label: "Pedido", format: "text" },
      { key: "data", label: "Data", format: "datetime" },
      { key: "cliente", label: "Cliente", format: "text" },
      { key: "situacao", label: "Situação", format: "text" },
      { key: "pagamento", label: "Pagamento", format: "text" },
      { key: "subtotal", label: "Subtotal", format: "currency" },
      { key: "desconto", label: "Desconto", format: "currency" },
      { key: "total", label: "Total", format: "currency" },
    ],
    rows: orders.map<ReportRow>((order) => ({
      numero: `#${order.order_number}`,
      data: order.created_at,
      cliente: order.customer_name ?? "Não informado",
      situacao: order.status,
      pagamento: order.payment_method,
      subtotal: Number(order.subtotal ?? 0),
      desconto: Number(order.discount ?? 0),
      total: Number(order.total ?? 0),
    })),
    charts: [
      {
        id: "vendas-dia",
        title: "Faturamento por dia",
        type: "area",
        xKey: "dia",
        data: Array.from(daily.entries()).map(([iso, valor]) => ({ dia: dayLabel(iso), valor: round(valor) })),
        series: [{ key: "valor", label: "Faturamento", color: CHART_COLORS[0]! }],
      },
      {
        id: "pedidos-dia",
        title: "Pedidos por dia",
        type: "bar",
        xKey: "dia",
        data: Array.from(counts.entries()).map(([iso, valor]) => ({ dia: dayLabel(iso), valor })),
        series: [{ key: "valor", label: "Pedidos", color: CHART_COLORS[1]! }],
      },
      pieChart("vendas-pagamento", "Faturamento por forma de pagamento", byMethod),
    ],
  };
}

interface EntryReportRow {
  due_date: string;
  paid_at: string | null;
  type: string;
  status: string;
  description: string;
  amount: number;
  payment_method: string | null;
  category: { name: string; color: string | null } | null;
}

async function fetchEntries(period: ReportPeriod): Promise<EntryReportRow[]> {
  const { data, error } = await supabase
    .from("financial_entries")
    .select(sel("due_date, paid_at, type, status, description, amount, payment_method, category:expense_categories(name, color)"))
    .gte("due_date", period.from)
    .lte("due_date", period.to)
    .order("due_date", { ascending: true })
    .returns<EntryReportRow[]>();
  if (error) throw error;
  return data ?? [];
}

function entryTotals(entries: EntryReportRow[]) {
  const active = entries.filter((entry) => entry.status !== "cancelado");
  const sumType = (type: string) =>
    active.filter((entry) => entry.type === type).reduce((sum, entry) => sum + Number(entry.amount), 0);
  const receitas = sumType("receita");
  const saidas = sumType("despesa") + sumType("compra") + sumType("investimento");
  return { active, receitas, saidas, lucro: receitas - saidas };
}

async function financeiro(period: ReportPeriod): Promise<ReportResult> {
  const entries = await fetchEntries(period);
  const { active, receitas, saidas, lucro } = entryTotals(entries);
  const pendentes = entries
    .filter((entry) => entry.status === "pendente")
    .reduce((sum, entry) => sum + Number(entry.amount), 0);

  const daily = new Map<string, { dia: string; receitas: number; saidas: number }>();
  for (const entry of active) {
    const point = daily.get(entry.due_date) ?? { dia: dayLabel(entry.due_date), receitas: 0, saidas: 0 };
    if (entry.type === "receita") point.receitas += Number(entry.amount);
    else point.saidas += Number(entry.amount);
    daily.set(entry.due_date, point);
  }
  const byCategory = groupSum(
    active.filter((entry) => entry.type !== "receita"),
    (entry) => entry.category?.name ?? "Sem categoria",
    (entry) => Number(entry.amount),
  );

  return {
    kind: "financeiro",
    title: "Relatório Financeiro",
    kpis: [
      { label: "Receitas", value: round(receitas), format: "currency" },
      { label: "Saídas", value: round(saidas), format: "currency" },
      { label: "Resultado", value: round(lucro), format: "currency" },
      { label: "Pendentes", value: round(pendentes), format: "currency" },
    ],
    columns: [
      { key: "vencimento", label: "Vencimento", format: "date" },
      { key: "tipo", label: "Tipo", format: "text" },
      { key: "descricao", label: "Descrição", format: "text" },
      { key: "categoria", label: "Categoria", format: "text" },
      { key: "situacao", label: "Situação", format: "text" },
      { key: "pagamento", label: "Pago em", format: "date" },
      { key: "valor", label: "Valor", format: "currency" },
    ],
    rows: entries.map<ReportRow>((entry) => ({
      vencimento: entry.due_date,
      tipo: entry.type,
      descricao: entry.description,
      categoria: entry.category?.name ?? "—",
      situacao: entry.status,
      pagamento: entry.paid_at,
      valor: Number(entry.amount),
    })),
    charts: [
      {
        id: "fin-dia",
        title: "Receitas x Saídas por dia",
        type: "bar",
        xKey: "dia",
        data: Array.from(daily.values()).map((point) => ({
          dia: point.dia,
          receitas: round(point.receitas),
          saidas: round(point.saidas),
        })),
        series: [
          { key: "receitas", label: "Receitas", color: CHART_COLORS[2]! },
          { key: "saidas", label: "Saídas", color: CHART_COLORS[3]! },
        ],
      },
      pieChart("fin-categoria", "Saídas por categoria", byCategory),
    ],
  };
}

async function lucroReport(period: ReportPeriod): Promise<ReportResult> {
  const entries = await fetchEntries(period);
  const { active, receitas, saidas, lucro } = entryTotals(entries);

  const monthly = new Map<string, { mes: string; receitas: number; saidas: number }>();
  for (const entry of active) {
    const key = entry.due_date.slice(0, 7);
    const [year = "", month = ""] = key.split("-");
    const point = monthly.get(key) ?? { mes: `${month}/${year.slice(2)}`, receitas: 0, saidas: 0 };
    if (entry.type === "receita") point.receitas += Number(entry.amount);
    else point.saidas += Number(entry.amount);
    monthly.set(key, point);
  }
  const ordered = Array.from(monthly.entries()).sort(([a], [b]) => a.localeCompare(b));

  return {
    kind: "lucro",
    title: "Relatório de Lucro",
    kpis: [
      { label: "Receitas", value: round(receitas), format: "currency" },
      { label: "Custos e despesas", value: round(saidas), format: "currency" },
      { label: "Lucro", value: round(lucro), format: "currency" },
      { label: "Margem", value: receitas > 0 ? round((lucro / receitas) * 100) : 0, format: "percent" },
    ],
    columns: [
      { key: "mes", label: "Mês", format: "text" },
      { key: "receitas", label: "Receitas", format: "currency" },
      { key: "saidas", label: "Saídas", format: "currency" },
      { key: "lucro", label: "Lucro", format: "currency" },
      { key: "margem", label: "Margem", format: "percent" },
    ],
    rows: ordered.map<ReportRow>(([, point]) => ({
      mes: point.mes,
      receitas: round(point.receitas),
      saidas: round(point.saidas),
      lucro: round(point.receitas - point.saidas),
      margem: point.receitas > 0 ? round(((point.receitas - point.saidas) / point.receitas) * 100) : 0,
    })),
    charts: [
      {
        id: "lucro-mes",
        title: "Lucro por mês",
        type: "bar",
        xKey: "mes",
        data: ordered.map(([, point]) => ({
          mes: point.mes,
          lucro: round(point.receitas - point.saidas),
        })),
        series: [{ key: "lucro", label: "Lucro", color: CHART_COLORS[0]! }],
      },
      {
        id: "lucro-margem",
        title: "Margem por mês (%)",
        type: "line",
        xKey: "mes",
        data: ordered.map(([, point]) => ({
          mes: point.mes,
          margem: point.receitas > 0 ? round(((point.receitas - point.saidas) / point.receitas) * 100) : 0,
        })),
        series: [{ key: "margem", label: "Margem", color: CHART_COLORS[1]! }],
      },
    ],
  };
}

async function clientes(period: ReportPeriod): Promise<ReportResult> {
  const orders = (await fetchOrders(period)).filter((order) => order.status !== "cancelado");
  const map = new Map<string, { nome: string; pedidos: number; total: number; ultima: string }>();
  for (const order of orders) {
    const key = order.customer_id ?? order.customer_name ?? "Balcão";
    const current = map.get(key) ?? {
      nome: order.customer_name ?? "Balcão",
      pedidos: 0,
      total: 0,
      ultima: order.created_at,
    };
    current.pedidos += 1;
    current.total += Number(order.total ?? 0);
    if (order.created_at > current.ultima) current.ultima = order.created_at;
    map.set(key, current);
  }
  const list = Array.from(map.values()).sort((a, b) => b.total - a.total);
  const recorrentes = list.filter((item) => item.pedidos > 1).length;
  const total = list.reduce((sum, item) => sum + item.total, 0);

  return {
    kind: "clientes",
    title: "Relatório de Clientes",
    kpis: [
      { label: "Clientes atendidos", value: list.length, format: "number" },
      { label: "Recorrentes", value: recorrentes, format: "number" },
      { label: "Faturamento", value: round(total), format: "currency" },
      {
        label: "Gasto médio",
        value: list.length ? round(total / list.length) : 0,
        format: "currency",
      },
    ],
    columns: [
      { key: "nome", label: "Cliente", format: "text" },
      { key: "pedidos", label: "Pedidos", format: "number" },
      { key: "total", label: "Total gasto", format: "currency" },
      { key: "ticket", label: "Ticket médio", format: "currency" },
      { key: "ultima", label: "Última compra", format: "datetime" },
    ],
    rows: list.map<ReportRow>((item) => ({
      nome: item.nome,
      pedidos: item.pedidos,
      total: round(item.total),
      ticket: round(item.total / item.pedidos),
      ultima: item.ultima,
    })),
    charts: [
      {
        id: "clientes-top",
        title: "Top 10 clientes por gasto",
        type: "bar",
        xKey: "nome",
        data: list.slice(0, 10).map((item) => ({ nome: item.nome, valor: round(item.total) })),
        series: [{ key: "valor", label: "Gasto", color: CHART_COLORS[0]! }],
      },
      pieChart(
        "clientes-recorrencia",
        "Novos x recorrentes",
        new Map([
          ["Recorrentes", recorrentes],
          ["Compra única", list.length - recorrentes],
        ]),
      ),
    ],
  };
}

interface ItemReportRow {
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  orders: { created_at: string; status: string } | null;
}

async function produtos(period: ReportPeriod): Promise<ReportResult> {
  const { data, error } = await supabase
    .from("order_items")
    .select(sel("product_name, quantity, unit_price, line_total, orders!inner(created_at, status)"))
    .gte("orders.created_at", startOf(period))
    .lte("orders.created_at", endOf(period))
    .returns<ItemReportRow[]>();
  if (error) throw error;

  const items = (data ?? []).filter((item) => item.orders?.status !== "cancelado");
  const map = new Map<string, { nome: string; quantidade: number; total: number }>();
  for (const item of items) {
    const current = map.get(item.product_name) ?? { nome: item.product_name, quantidade: 0, total: 0 };
    current.quantidade += Number(item.quantity);
    current.total += Number(item.line_total ?? Number(item.unit_price) * Number(item.quantity));
    map.set(item.product_name, current);
  }
  const list = Array.from(map.values()).sort((a, b) => b.total - a.total);
  const total = list.reduce((sum, item) => sum + item.total, 0);
  const unidades = list.reduce((sum, item) => sum + item.quantidade, 0);

  return {
    kind: "produtos",
    title: "Relatório de Produtos",
    kpis: [
      { label: "Produtos vendidos", value: list.length, format: "number" },
      { label: "Unidades", value: round(unidades), format: "number" },
      { label: "Faturamento", value: round(total), format: "currency" },
      {
        label: "Preço médio",
        value: unidades ? round(total / unidades) : 0,
        format: "currency",
      },
    ],
    columns: [
      { key: "nome", label: "Produto", format: "text" },
      { key: "quantidade", label: "Quantidade", format: "number" },
      { key: "total", label: "Faturamento", format: "currency" },
      { key: "participacao", label: "Participação", format: "percent" },
    ],
    rows: list.map<ReportRow>((item) => ({
      nome: item.nome,
      quantidade: round(item.quantidade),
      total: round(item.total),
      participacao: total > 0 ? round((item.total / total) * 100) : 0,
    })),
    charts: [
      {
        id: "produtos-top",
        title: "Top 10 produtos por faturamento",
        type: "bar",
        xKey: "nome",
        data: list.slice(0, 10).map((item) => ({ nome: item.nome, valor: round(item.total) })),
        series: [{ key: "valor", label: "Faturamento", color: CHART_COLORS[0]! }],
      },
      pieChart(
        "produtos-participacao",
        "Participação no faturamento (top 8)",
        new Map(list.slice(0, 8).map((item) => [item.nome, round(item.total)])),
      ),
    ],
  };
}

interface IngredientReportRow {
  name: string;
  unit: string;
  quantity: number;
  min_stock: number;
  purchase_price: number;
  supplier: { name: string } | null;
}

async function estoque(): Promise<ReportResult> {
  const { data, error } = await supabase
    .from("ingredients")
    .select(sel("name, unit, quantity, min_stock, purchase_price, supplier:suppliers(name)"))
    .order("name", { ascending: true })
    .returns<IngredientReportRow[]>();
  if (error) throw error;

  const items = data ?? [];
  const valor = items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.purchase_price), 0);
  const criticos = items.filter((item) => Number(item.quantity) <= Number(item.min_stock));
  const zerados = items.filter((item) => Number(item.quantity) <= 0);

  return {
    kind: "estoque",
    title: "Relatório de Estoque",
    kpis: [
      { label: "Itens cadastrados", value: items.length, format: "number" },
      { label: "Valor em estoque", value: round(valor), format: "currency" },
      { label: "Estoque crítico", value: criticos.length, format: "number" },
      { label: "Sem estoque", value: zerados.length, format: "number" },
    ],
    columns: [
      { key: "nome", label: "Ingrediente", format: "text" },
      { key: "fornecedor", label: "Fornecedor", format: "text" },
      { key: "unidade", label: "Unidade", format: "text" },
      { key: "quantidade", label: "Saldo", format: "number" },
      { key: "minimo", label: "Mínimo", format: "number" },
      { key: "custo", label: "Custo unitário", format: "currency" },
      { key: "valor", label: "Valor total", format: "currency" },
    ],
    rows: items.map<ReportRow>((item) => ({
      nome: item.name,
      fornecedor: item.supplier?.name ?? "—",
      unidade: item.unit,
      quantidade: Number(item.quantity),
      minimo: Number(item.min_stock),
      custo: Number(item.purchase_price),
      valor: round(Number(item.quantity) * Number(item.purchase_price)),
    })),
    charts: [
      {
        id: "estoque-criticos",
        title: "Saldo x mínimo (itens críticos)",
        type: "bar",
        xKey: "nome",
        data: criticos.slice(0, 10).map((item) => ({
          nome: item.name,
          saldo: Number(item.quantity),
          minimo: Number(item.min_stock),
        })),
        series: [
          { key: "saldo", label: "Saldo", color: CHART_COLORS[3]! },
          { key: "minimo", label: "Mínimo", color: CHART_COLORS[1]! },
        ],
      },
      pieChart(
        "estoque-valor",
        "Valor imobilizado (top 8)",
        new Map(
          [...items]
            .sort((a, b) => Number(b.quantity) * Number(b.purchase_price) - Number(a.quantity) * Number(a.purchase_price))
            .slice(0, 8)
            .map((item) => [item.name, round(Number(item.quantity) * Number(item.purchase_price))]),
        ),
      ),
    ],
  };
}

interface SessionReportRow {
  opened_at: string;
  closed_at: string | null;
  status: string;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  total_in: number;
  total_out: number;
  total_withdrawal: number;
}

async function fluxoCaixa(period: ReportPeriod): Promise<ReportResult> {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select(
      sel(
        "opened_at, closed_at, status, opening_amount, closing_amount, expected_amount, difference, total_in, total_out, total_withdrawal",
      ),
    )
    .gte("opened_at", startOf(period))
    .lte("opened_at", endOf(period))
    .order("opened_at", { ascending: true })
    .returns<SessionReportRow[]>();
  if (error) throw error;

  const sessions = data ?? [];
  const entradas = sessions.reduce((sum, item) => sum + Number(item.total_in), 0);
  const saidas = sessions.reduce((sum, item) => sum + Number(item.total_out), 0);
  const sangrias = sessions.reduce((sum, item) => sum + Number(item.total_withdrawal), 0);
  const diferenca = sessions.reduce((sum, item) => sum + Number(item.difference ?? 0), 0);

  let saldo = 0;
  const acumulado = sessions.map((item) => {
    saldo += Number(item.total_in) - Number(item.total_out) - Number(item.total_withdrawal);
    return { dia: dayLabel(item.opened_at), saldo: round(saldo) };
  });

  return {
    kind: "fluxo-caixa",
    title: "Relatório de Fluxo de Caixa",
    kpis: [
      { label: "Entradas", value: round(entradas), format: "currency" },
      { label: "Saídas", value: round(saidas), format: "currency" },
      { label: "Sangrias", value: round(sangrias), format: "currency" },
      { label: "Diferença apurada", value: round(diferenca), format: "currency" },
    ],
    columns: [
      { key: "abertura", label: "Abertura", format: "datetime" },
      { key: "fechamento", label: "Fechamento", format: "datetime" },
      { key: "situacao", label: "Situação", format: "text" },
      { key: "inicial", label: "Valor inicial", format: "currency" },
      { key: "entradas", label: "Entradas", format: "currency" },
      { key: "saidas", label: "Saídas", format: "currency" },
      { key: "sangrias", label: "Sangrias", format: "currency" },
      { key: "contado", label: "Contado", format: "currency" },
      { key: "diferenca", label: "Diferença", format: "currency" },
    ],
    rows: sessions.map<ReportRow>((item) => ({
      abertura: item.opened_at,
      fechamento: item.closed_at,
      situacao: item.status,
      inicial: Number(item.opening_amount),
      entradas: Number(item.total_in),
      saidas: Number(item.total_out),
      sangrias: Number(item.total_withdrawal),
      contado: item.closing_amount === null ? null : Number(item.closing_amount),
      diferenca: item.difference === null ? null : Number(item.difference),
    })),
    charts: [
      {
        id: "caixa-saldo",
        title: "Saldo acumulado",
        type: "area",
        xKey: "dia",
        data: acumulado,
        series: [{ key: "saldo", label: "Saldo", color: CHART_COLORS[0]! }],
      },
      {
        id: "caixa-movimentos",
        title: "Movimentos por sessão",
        type: "bar",
        xKey: "dia",
        data: sessions.map((item) => ({
          dia: dayLabel(item.opened_at),
          entradas: round(Number(item.total_in)),
          saidas: round(Number(item.total_out)),
          sangrias: round(Number(item.total_withdrawal)),
        })),
        series: [
          { key: "entradas", label: "Entradas", color: CHART_COLORS[2]! },
          { key: "saidas", label: "Saídas", color: CHART_COLORS[3]! },
          { key: "sangrias", label: "Sangrias", color: CHART_COLORS[1]! },
        ],
      },
    ],
  };
}

export const reportService = {
  async generate(kind: ReportKind, period: ReportPeriod): Promise<ReportResult> {
    switch (kind) {
      case "vendas":
        return vendas(period);
      case "financeiro":
        return financeiro(period);
      case "lucro":
        return lucroReport(period);
      case "clientes":
        return clientes(period);
      case "produtos":
        return produtos(period);
      case "estoque":
        return estoque();
      case "fluxo-caixa":
        return fluxoCaixa(period);
      default:
        return vendas(period);
    }
  },
};
