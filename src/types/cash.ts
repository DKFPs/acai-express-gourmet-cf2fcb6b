export type CashSessionStatus = "aberto" | "fechado";
export type CashTransactionType = "entrada" | "saida" | "sangria";

export const CASH_TRANSACTION_TYPES: { value: CashTransactionType; label: string }[] = [
  { value: "entrada", label: "Entrada" },
  { value: "saida", label: "Saída" },
  { value: "sangria", label: "Sangria" },
];

export const CASH_TYPE_LABEL: Record<CashTransactionType, string> = {
  entrada: "Entrada",
  saida: "Saída",
  sangria: "Sangria",
};

export interface CashSession {
  id: string;
  status: CashSessionStatus;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference: number | null;
  total_in: number;
  total_out: number;
  total_withdrawal: number;
  opened_at: string;
  closed_at: string | null;
  auto_closed: boolean;
  notes: string | null;
  created_at: string;
}

export interface CashTransaction {
  id: string;
  session_id: string;
  type: CashTransactionType;
  amount: number;
  payment_method: string | null;
  description: string;
  order_id: string | null;
  created_at: string;
}

export interface CashTransactionInput {
  type: CashTransactionType;
  amount: number;
  payment_method: string | null;
  description: string;
}

/** Saldo esperado = abertura + entradas − saídas − sangrias. */
export function expectedBalance(session: CashSession) {
  return (
    Number(session.opening_amount) +
    Number(session.total_in) -
    Number(session.total_out) -
    Number(session.total_withdrawal)
  );
}
