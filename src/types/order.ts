import type { Tables } from "@/integrations/supabase/types";

export type Customer = Tables<"customers">;
export type OrderRow = Tables<"orders">;
export type OrderItemRow = Tables<"order_items">;
export type PaymentRow = Tables<"payments">;
export type OrderHistoryRow = Tables<"order_status_history">;

export type OrderStatus = "recebido" | "preparando" | "saiu_entrega" | "entregue" | "cancelado";

export type PaymentMethod = "dinheiro" | "pix" | "cartao_credito" | "cartao_debito" | "outro";

export type PaymentStatus = "pendente" | "pago" | "estornado";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  recebido: "Recebido",
  preparando: "Preparando",
  saiu_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "recebido",
  "preparando",
  "saiu_entrega",
  "entregue",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  outro: "Outro",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pendente: "Pendente",
  pago: "Pago",
  estornado: "Estornado",
};

export interface Order extends OrderRow {
  customer: Pick<Customer, "id" | "name" | "phone"> | null;
}

export interface OrderDetail extends Order {
  items: OrderItemRow[];
  payments: PaymentRow[];
  history: OrderHistoryRow[];
}

export type OrderSort = "recentes" | "antigos" | "maior_valor" | "menor_valor" | "numero";

export interface OrderFilters {
  search: string;
  status: OrderStatus | "todos";
  paymentMethod: PaymentMethod | "todas";
  paymentStatus: PaymentStatus | "todos";
  sort: OrderSort;
  page: number;
  pageSize: number;
}

export interface OrderItemInput {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  notes: string | null;
}

export interface OrderInput {
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  notes: string | null;
  delivery_fee: number;
  discount: number;
  items: OrderItemInput[];
}

export interface CustomerInput {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}
