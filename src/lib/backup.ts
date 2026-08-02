import { supabase } from "@/integrations/supabase/client";

const BACKUP_TABLES = [
  "companies",
  "company_settings",
  "profiles",
  "categories",
  "products",
  "product_ingredients",
  "customers",
  "orders",
  "order_items",
  "order_status_history",
  "payments",
  "suppliers",
  "ingredients",
  "stock_movements",
  "expense_categories",
  "financial_entries",
  "cash_sessions",
  "cash_transactions",
  "dashboard_goals",
] as const;

export type BackupData = Record<string, unknown[]>;

export async function collectBackup(onProgress?: (table: string) => void): Promise<BackupData> {
  const result: BackupData = {};
  for (const table of BACKUP_TABLES) {
    onProgress?.(table);
    const { data, error } = await supabase.from(table).select("*");
    if (error) throw error;
    result[table] = data ?? [];
  }
  return result;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadBackupJson(data: BackupData, companyName: string) {
  const payload = {
    generatedAt: new Date().toISOString(),
    company: companyName,
    version: 1,
    data,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  triggerDownload(blob, `backup-${slug(companyName)}-${stamp()}.json`);
}

export async function downloadBackupExcel(data: BackupData, companyName: string) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  for (const [table, rows] of Object.entries(data)) {
    const sheet = XLSX.utils.json_to_sheet(rows.length > 0 ? (rows as object[]) : [{ vazio: true }]);
    XLSX.utils.book_append_sheet(workbook, sheet, table.slice(0, 31));
  }
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  triggerDownload(
    new Blob([output], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `backup-${slug(companyName)}-${stamp()}.xlsx`,
  );
}

export function backupSummary(data: BackupData) {
  return Object.entries(data)
    .map(([table, rows]) => ({ table, count: rows.length }))
    .sort((a, b) => b.count - a.count);
}

function slug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .toLowerCase();
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}
