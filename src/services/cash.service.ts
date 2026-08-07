import { supabase } from "@/integrations/supabase/client";
import { movementsService } from "@/services/movements.service";
import {
  expectedBalance,
  type CashSession,
  type CashTransaction,
  type CashTransactionInput,
} from "@/types/cash";

export const cashService = {
  async listSessions(limit = 60): Promise<CashSession[]> {
    const { data, error } = await supabase
      .from("cash_sessions")
      .select("*")
      .order("opened_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as CashSession[];
  },

  async currentSession(): Promise<CashSession | null> {
    const { data, error } = await supabase
      .from("cash_sessions")
      .select("*")
      .eq("status", "aberto")
      .maybeSingle();
    if (error) throw error;
    return (data as unknown as CashSession) ?? null;
  },

  async transactions(sessionId: string): Promise<CashTransaction[]> {
    const { data, error } = await supabase
      .from("cash_transactions")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as CashTransaction[];
  },

  async open(openingAmount: number, notes: string | null, companyId: string | null) {
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase.from("cash_sessions").insert({
      opening_amount: openingAmount,
      notes,
      ...(companyId ? { company_id: companyId } : {}),
      status: "aberto",
      opened_by: user.user?.id ?? null,
    });
    if (error) throw error;
  },

  /** Movimentação de caixa registrada pelo Núcleo de Movimentações. */
  async addTransaction(sessionId: string, input: CashTransactionInput) {
    await movementsService.cash({
      session_id: sessionId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      payment_method: input.payment_method || null,
    });
  },

  async removeTransaction(id: string) {
    const { error } = await supabase.from("cash_transactions").delete().eq("id", id);
    if (error) throw error;
  },

  async close(session: CashSession, closingAmount: number, notes: string | null, auto = false) {
    const expected = expectedBalance(session);
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("cash_sessions")
      .update({
        status: "fechado",
        closing_amount: closingAmount,
        expected_amount: expected,
        difference: closingAmount - expected,
        closed_at: new Date().toISOString(),
        auto_closed: auto,
        closed_by: user.user?.id ?? null,
        notes: notes ?? session.notes,
      })
      .eq("id", session.id);
    if (error) throw error;
  },

  /**
   * Fechamento automático: se existe caixa aberto de um dia anterior,
   * fecha usando o saldo esperado (sem diferença) e marca como automático.
   */
  async autoCloseStale(): Promise<boolean> {
    const session = await this.currentSession();
    if (!session) return false;
    const openedDay = new Date(session.opened_at).toDateString();
    if (openedDay === new Date().toDateString()) return false;
    await this.close(session, expectedBalance(session), "Fechamento automático", true);
    return true;
  },
};
