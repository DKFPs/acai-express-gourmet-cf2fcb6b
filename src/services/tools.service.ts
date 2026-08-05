import { supabase } from "@/integrations/supabase/client";
import type { Reminder, TaskInput, TaskItem } from "@/types/tools";

/**
 * As tabelas `reminders` e `tasks` são novas e ainda podem não existir no banco
 * (a migração precisa ser aplicada). Usamos um client sem tipos gerados para
 * essas duas tabelas e tratamos o erro de tabela ausente de forma amigável.
 */
interface LooseResult {
  data: unknown;
  error: { code?: string; message?: string } | null;
}

interface LooseQuery extends PromiseLike<LooseResult> {
  select: (columns?: string) => LooseQuery;
  insert: (values: Record<string, unknown>) => LooseQuery;
  update: (values: Record<string, unknown>) => LooseQuery;
  delete: () => LooseQuery;
  eq: (column: string, value: unknown) => LooseQuery;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => LooseQuery;
}

const db = supabase as unknown as { from: (table: string) => LooseQuery };

export class MissingToolsTablesError extends Error {
  constructor() {
    super(
      "As tabelas de lembretes e tarefas ainda não existem no banco. Aplique a migração SQL de Ferramentas.",
    );
    this.name = "MissingToolsTablesError";
  }
}

function handle(error: { code?: string; message?: string } | null) {
  if (!error) return;
  const missing =
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (error.message ?? "").includes("does not exist");
  if (missing) throw new MissingToolsTablesError();
  throw new Error(error.message ?? "Erro ao acessar lembretes/tarefas.");
}

export const toolsService = {
  async listReminders(): Promise<Reminder[]> {
    const { data, error } = await db
      .from("reminders")
      .select("*")
      .order("done", { ascending: true })
      .order("created_at", { ascending: false });
    handle(error);
    return (data ?? []) as Reminder[];
  },

  async createReminder(title: string, companyId: string | null, userId: string | null) {
    const { error } = await db.from("reminders").insert({
      title: title.trim(),
      ...(companyId ? { company_id: companyId } : {}),
      ...(userId ? { created_by: userId } : {}),
    });
    handle(error);
  },

  async toggleReminder(id: string, done: boolean) {
    const { error } = await db
      .from("reminders")
      .update({ done, updated_at: new Date().toISOString() })
      .eq("id", id);
    handle(error);
  },

  async removeReminder(id: string) {
    const { error } = await db.from("reminders").delete().eq("id", id);
    handle(error);
  },

  async listTasks(): Promise<TaskItem[]> {
    const { data, error } = await db
      .from("tasks")
      .select("*")
      .order("done", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });
    handle(error);
    return (data ?? []) as TaskItem[];
  },

  async createTask(input: TaskInput, companyId: string | null, userId: string | null) {
    const { error } = await db.from("tasks").insert({
      ...input,
      title: input.title.trim(),
      ...(companyId ? { company_id: companyId } : {}),
      ...(userId ? { created_by: userId } : {}),
    });
    handle(error);
  },

  async toggleTask(id: string, done: boolean) {
    const { error } = await db
      .from("tasks")
      .update({
        done,
        done_at: done ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    handle(error);
  },

  async removeTask(id: string) {
    const { error } = await db.from("tasks").delete().eq("id", id);
    handle(error);
  },
};
