import { supabase } from "@/integrations/supabase/client";
import type {
  Customer,
  CustomerInput,
  Order,
  OrderDetail,
  OrderFilters,
  OrderInput,
  OrderStatus,
} from "@/types/order";

const ORDER_SELECT = "*, customer:customers(id, name, phone)";

export interface OrderListResult {
  items: Order[];
  total: number;
}

interface SortableQuery<T> {
  order: (column: string, options?: { ascending?: boolean }) => T;
}

function applySort<T extends SortableQuery<T>>(query: T, sort: OrderFilters["sort"]): T {
  switch (sort) {
    case "antigos":
      return query.order("created_at", { ascending: true });
    case "maior_valor":
      return query.order("total", { ascending: false });
    case "menor_valor":
      return query.order("total", { ascending: true });
    case "numero":
      return query.order("order_number", { ascending: false });
    default:
      return query.order("created_at", { ascending: false });
  }
}

export const orderService = {
  async list(filters: OrderFilters): Promise<OrderListResult> {
    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;

    let query = supabase.from("orders").select(ORDER_SELECT, { count: "exact" });
    query = applySort(query, filters.sort).range(from, to);

    const search = filters.search.trim();
    if (search) {
      const escaped = search.replace(/[%,()]/g, " ");
      const numeric = Number(escaped);
      const clauses = [`customer_name.ilike.%${escaped}%`, `customer_phone.ilike.%${escaped}%`];
      if (Number.isFinite(numeric) && escaped !== "") clauses.push(`order_number.eq.${numeric}`);
      query = query.or(clauses.join(","));
    }
    if (filters.status !== "todos") query = query.eq("status", filters.status);
    if (filters.paymentMethod !== "todas")
      query = query.eq("payment_method", filters.paymentMethod);
    if (filters.paymentStatus !== "todos")
      query = query.eq("payment_status", filters.paymentStatus);

    const { data, error, count } = await query;
    if (error) throw error;
    return { items: (data ?? []) as unknown as Order[], total: count ?? 0 };
  },

  async detail(id: string): Promise<OrderDetail> {
    const [orderRes, itemsRes, paymentsRes, historyRes] = await Promise.all([
      supabase.from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", id).order("created_at"),
      supabase.from("payments").select("*").eq("order_id", id).order("created_at"),
      supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (orderRes.error) throw orderRes.error;
    if (!orderRes.data) throw new Error("Pedido não encontrado");
    if (itemsRes.error) throw itemsRes.error;
    if (paymentsRes.error) throw paymentsRes.error;
    if (historyRes.error) throw historyRes.error;

    return {
      ...(orderRes.data as unknown as Order),
      items: itemsRes.data ?? [],
      payments: paymentsRes.data ?? [],
      history: historyRes.data ?? [],
    };
  },

  async create(input: OrderInput, companyId: string | null, userId: string | null) {
    const subtotal = input.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        ...(companyId ? { company_id: companyId } : {}),
        created_by: userId,
        customer_id: input.customer_id,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        delivery_address: input.delivery_address,
        payment_method: input.payment_method,
        payment_status: input.payment_status,
        notes: input.notes,
        delivery_fee: input.delivery_fee,
        discount: input.discount,
        subtotal,
      })
      .select("id")
      .single();
    if (error) throw error;

    const { error: itemsError } = await supabase.from("order_items").insert(
      input.items.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        notes: item.notes,
      })),
    );
    if (itemsError) throw itemsError;

    const total = Math.max(subtotal + input.delivery_fee - input.discount, 0);
    const { error: paymentError } = await supabase.from("payments").insert({
      order_id: order.id,
      amount: total,
      method: input.payment_method,
      status: input.payment_status,
      paid_at: input.payment_status === "pago" ? new Date().toISOString() : null,
    });
    if (paymentError) throw paymentError;

    return order.id;
  },

  async updateStatus(id: string, status: OrderStatus) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) throw error;
  },

  async updatePayment(id: string, status: OrderDetail["payment_status"]) {
    const { error } = await supabase.from("orders").update({ payment_status: status }).eq("id", id);
    if (error) throw error;
    const { error: payError } = await supabase
      .from("payments")
      .update({ status, paid_at: status === "pago" ? new Date().toISOString() : null })
      .eq("order_id", id);
    if (payError) throw payError;
  },

  async remove(id: string) {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) throw error;
  },
};

export const customerService = {
  async list(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("is_active", true)
      .order("name");
    if (error) throw error;
    return data ?? [];
  },

  async create(input: CustomerInput, companyId: string | null): Promise<Customer> {
    const { data, error } = await supabase
      .from("customers")
      .insert({ ...input, ...(companyId ? { company_id: companyId } : {}) })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },
};
