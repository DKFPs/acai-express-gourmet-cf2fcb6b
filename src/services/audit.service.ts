import { supabase } from "@/integrations/supabase/client";
import type { AuditLog } from "@/types/saas";

export interface AuditFilters {
  table?: string;
  action?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export const auditService = {
  async list(companyId: string, filters: AuditFilters = {}): Promise<AuditLog[]> {
    let query = supabase
      .from("audit_logs")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(filters.limit ?? 200);

    if (filters.table && filters.table !== "todos") query = query.eq("table_name", filters.table);
    if (filters.action && filters.action !== "todos") query = query.eq("action", filters.action);
    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to) query = query.lte("created_at", filters.to);
    if (filters.search) query = query.ilike("user_name", `%${filters.search}%`);

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },
};
