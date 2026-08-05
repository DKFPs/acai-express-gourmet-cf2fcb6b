export type FinancialType = "receita" | "despesa" | "compra" | "investimento";
export type FinancialStatus = "pago" | "pendente" | "cancelado";
export type CashRegisterStatus = "aberto" | "fechado";
export type FinancePaymentMethod =
  "dinheiro" | "pix" | "cartao_credito" | "cartao_debito" | "outro";

export const FINANCIAL_TYPES: { value: FinancialType; label: string }[] = [
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
  { value: "compra", label: "Compra" },
  { value: "investimento", label: "Investimento" },
];

export const FINANCIAL_STATUS: { value: FinancialStatus; label: string }[] = [
  { value: "pago", label: "Pago" },
  { value: "pendente", label: "Pendente" },
  { value: "cancelado", label: "Cancelado" },
];

export const FINANCE_PAYMENT_METHODS: { value: FinancePaymentMethod; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "cartao_credito", label: "Cartão de crédito" },
  { value: "cartao_debito", label: "Cartão de débito" },
  { value: "outro", label: "Outro" },
];

export const TYPE_LABEL: Record<FinancialType, string> = {
  receita: "Receita",
  despesa: "Despesa",
  compra: "Compra",
  investimento: "Investimento",
};

export const STATUS_LABEL: Record<FinancialStatus, string> = {
  pago: "Pago",
  pendente: "Pendente",
  cancelado: "Cancelado",
};

export interface ExpenseCategory {
  id: string;
  name: string;
  type: FinancialType;
  color: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ExpenseCategoryInput {
  name: string;
  type: FinancialType;
  color: string | null;
  description: string | null;
  is_active: boolean;
}

export interface FinancialEntry {
  id: string;
  category_id: string | null;
  order_id: string | null;
  supplier_id: string | null;
  type: FinancialType;
  status: FinancialStatus;
  description: string;
  amount: number;
  payment_method: FinancePaymentMethod | null;
  due_date: string;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  category?: { id: string; name: string; color: string | null } | null;
  supplier?: { id: string; name: string } | null;
}

export interface FinancialEntryInput {
  type: FinancialType;
  status: FinancialStatus;
  description: string;
  amount: number;
  category_id: string | null;
  supplier_id: string | null;
  payment_method: FinancePaymentMethod | null;
  due_date: string;
  paid_at: string | null;
  notes: string | null;
}

export interface FinancialFilters {
  search: string;
  type: FinancialType | "todos";
  status: FinancialStatus | "todos";
  categoryId: string;
  from: string;
  to: string;
  page: number;
  pageSize: number;
}

export interface CashRegister {
  id: string;
  status: CashRegisterStatus;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
}

/** Entradas de dinheiro (receitas) x saídas (despesas, compras, investimentos). */
export function isIncome(type: FinancialType) {
  return type === "receita";
}

export function signedAmount(entry: Pick<FinancialEntry, "type" | "amount">) {
  return isIncome(entry.type) ? Number(entry.amount) : -Number(entry.amount);
}
