import { supabase } from "@/integrations/supabase/client";
import type {
  CashRegister,
  ExpenseCategory,
  ExpenseCategoryInput,
  FinancialEntry,
  FinancialEntryInput,
  FinancialFilters,
} from "@/types/finance";

const ENTRY_SELECT = "*, category:expense_categories(id, name, color), supplier:suppliers(id, name)";

export interface EntryListResult {
  items: FinancialEntry[];
  total: number;
}

export const financeService = {
  async list(filters: FinancialFilters): Promise<EntryListResult> {
    let query = supabase
      .from("financial_entries")
      .select(ENTRY_SELECT, { count: "exact" })
      .order("due_date", { ascending: false })
      .order("created_at", { ascending: false });

    const search = filters.search.trim();
    if (search) query = query.ilike("description", `%${search.replace(/[%,()]/g, " ")}%`);
    if (filters.type !== "todos") query = query.eq("type", filters.type);
    if (filters.status !== "todos") query = query.eq("status", filters.status);
    if (filters.categoryId !== "todas") query = query.eq("category_id", filters.categoryId);
    if (filters.from) query = query.gte("due_date", filters.from);
    if (filters.to) query = query.lte("due_date", filters.to);

    const from = (filters.page - 1) * filters.pageSize;
    const { data, error, count } = await query.range(from, from + filters.pageSize - 1);
    if (error) throw error;
    return { items: (data ?? []) as unknown as FinancialEntry[], total: count ?? 0 };
  },

  /** Lançamentos de um período — usado pelo dashboard, gráficos e exportações. */
  async range(from: string, to: string): Promise<FinancialEntry[]> {
    const { data, error } = await supabase
      .from("financial_entries")
      .select(ENTRY_SELECT)
      .gte("due_date", from)
      .lte("due_date", to)
      .order("due_date", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as FinancialEntry[];
  },

  async create(input: FinancialEntryInput, companyId: string | null) {
    const { error } = await supabase
      .from("financial_entries")
      .insert({ ...input, company_id: companyId ?? undefined });
    if (error) throw error;
  },

  async update(id: string, input: FinancialEntryInput) {
    const { error } = await supabase.from("financial_entries").update(input).eq("id", id);
    if (error) throw error;
  },

  async settle(id: string) {
    const { error } = await supabase
      .from("financial_entries")
      .update({ status: "pago", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("financial_entries").delete().eq("id", id);
    if (error) throw error;
  },
};

export const expenseCategoryService = {
  async list(): Promise<ExpenseCategory[]> {
    const { data, error } = await supabase
      .from("expense_categories")
      .select("*")
      .order("type", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as ExpenseCategory[];
  },

  async create(input: ExpenseCategoryInput, companyId: string | null) {
    const { error } = await supabase
      .from("expense_categories")
      .insert({ ...input, company_id: companyId ?? undefined });
    if (error) throw error;
  },

  async update(id: string, input: ExpenseCategoryInput) {
    const { error } = await supabase.from("expense_categories").update(input).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("expense_categories").delete().eq("id", id);
    if (error) throw error;
  },
};

export const cashRegisterService = {
  async list(): Promise<CashRegister[]> {
    const { data, error } = await supabase
      .from("cash_register")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return (data ?? []) as unknown as CashRegister[];
  },

  async open(openingAmount: number, notes: string | null, companyId: string | null) {
    const { error } = await supabase.from("cash_register").insert({
      opening_amount: openingAmount,
      notes,
      company_id: companyId ?? undefined,
      status: "aberto",
    });
    if (error) throw error;
  },

  async close(id: string, closingAmount: number, expectedAmount: number, notes: string | null) {
    const { error } = await supabase
      .from("cash_register")
      .update({
        status: "fechado",
        closing_amount: closingAmount,
        expected_amount: expectedAmount,
        difference: closingAmount - expectedAmount,
        closed_at: new Date().toISOString(),
        notes,
      })
      .eq("id", id);
    if (error) throw error;
  },
};
