import type { Tables } from "@/integrations/supabase/types";

export type CompanySettings = Tables<"company_settings">;
export type AuditLog = Tables<"audit_logs">;
export type NotificationRow = Tables<"notifications">;
export type UserFavorite = Tables<"user_favorites">;

export interface OpeningHoursDay {
  open: string;
  close: string;
  closed: boolean;
}

export type OpeningHours = Record<string, OpeningHoursDay>;

export const WEEK_DAYS: { key: string; label: string }[] = [
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
  { key: "dom", label: "Domingo" },
];

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
  outro: "Outro",
};

export interface CompanyMember {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  role: "administrador" | "funcionario";
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  insert: "Criação",
  update: "Alteração",
  delete: "Exclusão",
};

export const AUDIT_TABLE_LABELS: Record<string, string> = {
  products: "Produtos",
  orders: "Pedidos",
  customers: "Clientes",
  ingredients: "Estoque",
  financial_entries: "Financeiro",
  cash_sessions: "Caixa",
  suppliers: "Fornecedores",
  categories: "Categorias",
  company_settings: "Configurações",
  user_roles: "Permissões",
  profiles: "Usuários",
};
