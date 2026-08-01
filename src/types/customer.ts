import type { Customer } from "@/types/order";
import type { Order } from "@/types/order";

export type { Customer };

export interface CustomerStats {
  customer_id: string;
  orders_count: number;
  total_spent: number;
  last_purchase: string | null;
}

export interface CustomerWithStats extends Customer {
  stats: CustomerStats;
}

export type CustomerSort =
  | "nome"
  | "recentes"
  | "maior_gasto"
  | "mais_pedidos"
  | "ultima_compra";

export interface CustomerFilters {
  search: string;
  status: "todos" | "ativos" | "inativos";
  city: string;
  hasOrders: "todos" | "com" | "sem";
  sort: CustomerSort;
  page: number;
  pageSize: number;
}

export const CUSTOMER_SORT_LABELS: Record<CustomerSort, string> = {
  nome: "Nome (A-Z)",
  recentes: "Cadastro mais recente",
  maior_gasto: "Maior valor gasto",
  mais_pedidos: "Mais pedidos",
  ultima_compra: "Última compra",
};

export interface CustomerInputFull {
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  zip_code: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface CustomerDetail extends CustomerWithStats {
  orders: Order[];
  averageTicket: number;
  firstPurchase: string | null;
}
