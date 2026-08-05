import { supabase } from "@/integrations/supabase/client";

import type { BackupData } from "@/lib/backup";

/**
 * Tabelas que podem ser restauradas a partir de um backup JSON.
 * A ordem respeita as dependências (pais antes dos filhos).
 * `companies`, `profiles` e papéis ficam de fora por segurança.
 */
export const RESTORABLE_TABLES = [
  "company_settings",
  "categories",
  "suppliers",
  "expense_categories",
  "products",
  "ingredients",
  "product_ingredients",
  "customers",
  "orders",
  "order_items",
  "order_status_history",
  "payments",
  "stock_movements",
  "financial_entries",
  "cash_sessions",
  "cash_transactions",
  "dashboard_goals",
] as const;

export type RestorableTable = (typeof RESTORABLE_TABLES)[number];

export interface RestoreResult {
  table: string;
  inserted: number;
  skipped: number;
  error: string | null;
}

export function parseBackupFile(raw: string): BackupData {
  const parsed = JSON.parse(raw) as { data?: BackupData } | BackupData;
  const data = (parsed as { data?: BackupData }).data ?? (parsed as BackupData);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Arquivo de backup inválido.");
  }
  return data;
}

export function backupPreview(data: BackupData) {
  return RESTORABLE_TABLES.map((table) => ({
    table,
    count: Array.isArray(data[table]) ? (data[table] as unknown[]).length : 0,
  })).filter((item) => item.count > 0);
}

const CHUNK = 200;

/**
 * Restaura o backup com upsert por `id`. As políticas de RLS do banco continuam
 * valendo: apenas administradores da própria empresa conseguem gravar.
 */
export async function restoreBackup(
  data: BackupData,
  companyId: string,
  onProgress?: (table: string) => void,
): Promise<RestoreResult[]> {
  const results: RestoreResult[] = [];

  for (const table of RESTORABLE_TABLES) {
    const rows = Array.isArray(data[table]) ? (data[table] as Record<string, unknown>[]) : [];
    if (rows.length === 0) continue;
    onProgress?.(table);

    const scoped = rows
      .filter((row) => !("company_id" in row) || row["company_id"] === companyId)
      .map((row) => ({ ...row, ...("company_id" in row ? { company_id: companyId } : {}) }));

    let inserted = 0;
    let error: string | null = null;

    for (let index = 0; index < scoped.length; index += CHUNK) {
      const chunk = scoped.slice(index, index + CHUNK);
      const client = supabase as unknown as {
        from: (name: string) => {
          upsert: (
            rows: Record<string, unknown>[],
            options: { onConflict: string },
          ) => PromiseLike<{ error: { message: string } | null }>;
        };
      };
      const response = await client.from(table).upsert(chunk, { onConflict: "id" });
      if (response.error) {
        error = response.error.message as string;
        break;
      }
      inserted += chunk.length;
    }

    results.push({
      table,
      inserted,
      skipped: rows.length - scoped.length,
      error,
    });
  }

  return results;
}
