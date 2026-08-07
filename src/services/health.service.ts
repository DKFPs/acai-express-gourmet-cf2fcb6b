import { supabase } from "@/integrations/supabase/client";

export type FunctionCheckStatus =
  | "ok"
  | "ausente"
  | "permissao_faltando"
  | "permissao_excessiva"
  | "modo_seguranca_divergente"
  | "search_path_inseguro";

export interface FunctionCheck {
  schema_name: string;
  function_name: string;
  arguments: string;
  status: FunctionCheckStatus;
  detail: string;
}

export interface HealthCheckRecord {
  id: string;
  source: string;
  passed: boolean;
  total: number;
  failures: FunctionCheck[];
  created_at: string;
}

export const healthService = {
  async checkFunctions(): Promise<FunctionCheck[]> {
    const client = supabase as unknown as {
      rpc: (name: string) => Promise<{ data: FunctionCheck[] | null; error: Error | null }>;
    };
    const { data, error } = await client.rpc("check_system_functions");
    if (error) throw error;
    return data ?? [];
  },

  async listChecks(limit = 10): Promise<HealthCheckRecord[]> {
    const client = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          order: (
            column: string,
            options: { ascending: boolean },
          ) => {
            limit: (
              n: number,
            ) => Promise<{ data: HealthCheckRecord[] | null; error: Error | null }>;
          };
        };
      };
    };
    const { data, error } = await client
      .from("system_health_checks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
};
