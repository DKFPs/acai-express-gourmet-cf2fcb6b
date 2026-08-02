import { supabase } from "@/integrations/supabase/client";
import type {
  CustomerDetail,
  CustomerFilters,
  CustomerInputFull,
  CustomerStats,
  CustomerWithStats,
} from "@/types/customer";
import type { Customer, Order } from "@/types/order";

const EMPTY_STATS = (id: string): CustomerStats => ({
  customer_id: id,
  orders_count: 0,
  total_spent: 0,
  last_purchase: null,
});

export interface CustomerListResult {
  items: CustomerWithStats[];
  total: number;
}

async function fetchStatsMap(): Promise<Map<string, CustomerStats>> {
  const { data, error } = await supabase.rpc("customer_stats");
  if (error) throw error;
  const map = new Map<string, CustomerStats>();
  for (const row of data ?? []) {
    map.set(row.customer_id, {
      customer_id: row.customer_id,
      orders_count: Number(row.orders_count ?? 0),
      total_spent: Number(row.total_spent ?? 0),
      last_purchase: row.last_purchase,
    });
  }
  return map;
}

function sortCustomers(items: CustomerWithStats[], sort: CustomerFilters["sort"]) {
  const copy = [...items];
  switch (sort) {
    case "recentes":
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case "maior_gasto":
      return copy.sort((a, b) => b.stats.total_spent - a.stats.total_spent);
    case "mais_pedidos":
      return copy.sort((a, b) => b.stats.orders_count - a.stats.orders_count);
    case "ultima_compra":
      return copy.sort((a, b) =>
        (b.stats.last_purchase ?? "").localeCompare(a.stats.last_purchase ?? ""),
      );
    default:
      return copy.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }
}

export const customerService = {
  async listAll(): Promise<CustomerWithStats[]> {
    const [{ data, error }, statsMap] = await Promise.all([
      supabase.from("customers").select("*"),
      fetchStatsMap(),
    ]);
    if (error) throw error;
    return (data ?? []).map((customer) => ({
      ...customer,
      stats: statsMap.get(customer.id) ?? EMPTY_STATS(customer.id),
    }));
  },

  async list(filters: CustomerFilters): Promise<CustomerListResult> {
    const all = await customerService.listAll();
    const search = filters.search.trim().toLowerCase();

    const filtered = all.filter((customer) => {
      if (filters.status === "ativos" && !customer.is_active) return false;
      if (filters.status === "inativos" && customer.is_active) return false;
      if (filters.city !== "todas" && (customer.city ?? "") !== filters.city) return false;
      if (filters.hasOrders === "com" && customer.stats.orders_count === 0) return false;
      if (filters.hasOrders === "sem" && customer.stats.orders_count > 0) return false;
      if (!search) return true;
      return [customer.name, customer.phone, customer.whatsapp, customer.email, customer.city]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });

    const sorted = sortCustomers(filtered, filters.sort);
    const from = (filters.page - 1) * filters.pageSize;
    return { items: sorted.slice(from, from + filters.pageSize), total: sorted.length };
  },

  async ranking(limit = 5): Promise<CustomerWithStats[]> {
    const all = await customerService.listAll();
    return sortCustomers(all, "maior_gasto")
      .filter((customer) => customer.stats.orders_count > 0)
      .slice(0, limit);
  },

  async detail(id: string): Promise<CustomerDetail> {
    const [customerRes, ordersRes, statsMap] = await Promise.all([
      supabase.from("customers").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("customers")
        .select("id")
        .eq("id", id)
        .then(() =>
          supabase
            .from("orders")
            .select("*, customer:customers(id, name, phone)")
            .eq("customer_id", id)
            .order("created_at", { ascending: false }),
        ),
      fetchStatsMap(),
    ]);

    if (customerRes.error) throw customerRes.error;
    if (!customerRes.data) throw new Error("Cliente não encontrado");
    if (ordersRes.error) throw ordersRes.error;

    const orders = (ordersRes.data ?? []) as unknown as Order[];
    const stats = statsMap.get(id) ?? EMPTY_STATS(id);
    const valid = orders.filter((order) => order.status !== "cancelado");
    const firstPurchase = valid.length ? valid[valid.length - 1]!.created_at : null;

    return {
      ...(customerRes.data as Customer),
      stats,
      orders,
      averageTicket: stats.orders_count ? stats.total_spent / stats.orders_count : 0,
      firstPurchase,
    };
  },

  async create(input: CustomerInputFull, companyId: string | null): Promise<Customer> {
    const { data, error } = await supabase
      .from("customers")
      .insert({ ...input, company_id: companyId ?? undefined })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, input: CustomerInputFull): Promise<Customer> {
    const { data, error } = await supabase
      .from("customers")
      .update(input)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string) {
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) throw error;
  },
};
