import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SystemMovement = Tables<"system_movements">;

export interface MovementFilters {
  type?: string;
  origin?: string;
  from?: string;
  to?: string;
  limit?: number;
}

/**
 * Núcleo de Movimentações — único ponto de escrita operacional do sistema.
 * Nenhum módulo deve gravar diretamente em estoque, caixa, financeiro,
 * produção, produtos acabados ou vendas: tudo passa por aqui.
 * Cada função abaixo grava a movimentação e aplica o efeito na mesma transação.
 */
const opt = (value: string | null | undefined) => value ?? undefined;

export const movementsService = {
  /** Histórico consolidado de movimentações. */
  async list(filters: MovementFilters = {}): Promise<SystemMovement[]> {
    let query = supabase
      .from("system_movements")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(filters.limit ?? 200);

    if (filters.type && filters.type !== "todos") query = query.eq("type", filters.type as never);
    if (filters.origin && filters.origin !== "todas") {
      query = query.eq("origin", filters.origin as never);
    }
    if (filters.from) query = query.gte("occurred_at", filters.from);
    if (filters.to) query = query.lte("occurred_at", filters.to);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  /** Estoque de ingredientes (entrada, saída, ajuste). */
  async stock(input: {
    ingredient_id: string;
    type: "entrada" | "saida" | "ajuste";
    quantity: number;
    unit_cost: number;
    reason: string | null;
  }) {
    const { error } = await supabase.rpc("record_stock_movement", {
      _ingredient_id: opt(input.ingredient_id),
      _type: input.type,
      _quantity: input.quantity,
      _unit_cost: input.unit_cost,
      _reason: opt(input.reason),
    });
    if (error) throw error;
  },

  /** Compra de ingrediente ou embalagem (atualiza estoque e custo médio). */
  async purchase(input: {
    kind: string;
    item_name: string;
    quantity: number;
    total_value: number;
    unit: string;
    purchase_date: string;
    ingredient_id: string | null;
    packaging_id: string | null;
    supplier_id: string | null;
    supplier_name: string | null;
    category_id: string | null;
    notes: string | null;
  }) {
    const { error } = await supabase.rpc("record_purchase", {
      _kind: input.kind,
      _item_name: input.item_name,
      _quantity: input.quantity,
      _total_value: input.total_value,
      _unit: input.unit,
      _purchase_date: input.purchase_date,
      _ingredient_id: opt(input.ingredient_id),
      _packaging_id: opt(input.packaging_id),
      _supplier_id: opt(input.supplier_id),
      _supplier_name: opt(input.supplier_name),
      _category_id: opt(input.category_id),
      _notes: opt(input.notes),
    });
    if (error) throw error;
  },

  /** Baixa de venda de um pedido (produtos e ingredientes das receitas). */
  async sale(orderId: string) {
    const { error } = await supabase.rpc("record_order_sale", { _order_id: orderId });
    if (error) throw error;
  },

  /** Movimentação de caixa (entrada, saída, sangria). */
  async cash(input: {
    session_id: string;
    type: "entrada" | "saida" | "sangria";
    amount: number;
    description: string;
    payment_method?: string | null;
    order_id?: string | null;
  }) {
    const { error } = await supabase.rpc("record_cash_transaction", {
      _session_id: input.session_id,
      _type: input.type,
      _amount: input.amount,
      _description: input.description,
      _payment_method: opt(input.payment_method),
      _order_id: opt(input.order_id),
    });
    if (error) throw error;
  },

  /** Lançamento financeiro (receita, despesa, compra, investimento). */
  async financial(input: {
    type: string;
    description: string;
    amount: number;
    due_date: string;
    status: string;
    category_id: string | null;
    supplier_id: string | null;
    payment_method: string | null;
    notes: string | null;
  }) {
    const { error } = await supabase.rpc("record_financial_entry", {
      _type: input.type,
      _description: input.description,
      _amount: input.amount,
      _due_date: input.due_date,
      _status: input.status,
      _category_id: opt(input.category_id),
      _supplier_id: opt(input.supplier_id),
      _payment_method: opt(input.payment_method),
      _notes: opt(input.notes),
    });
    if (error) throw error;
  },

  /** Movimentação de produto acabado (produção, venda, descarte, reserva...). */
  async finished(input: {
    finished_product_id: string;
    type: string;
    quantity: number;
    batch_id?: string | null;
    reason: string | null;
  }) {
    const { error } = await supabase.rpc("record_finished_movement", {
      _finished_product_id: input.finished_product_id,
      _type: input.type,
      _quantity: input.quantity,
      _batch_id: opt(input.batch_id),
      _reason: opt(input.reason),
    });
    if (error) throw error;
  },

  /** Estorna uma movimentação já aplicada, revertendo exatamente o efeito. */
  async reverse(movementId: string, reason = "Estorno") {
    const { error } = await supabase.rpc("reverse_movement", {
      _movement_id: movementId,
      _reason: reason,
    });
    if (error) throw error;
  },
};
