import { supabase } from "@/integrations/supabase/client";
import type { Purchase, PurchaseFilters, PurchaseInput } from "@/types/purchase";

const SELECT = "*, supplier:suppliers(id, name), category:categories(id, name, color)";

export const purchaseService = {
  async list(filters: PurchaseFilters): Promise<Purchase[]> {
    let query = supabase
      .from("purchases")
      .select(SELECT)
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);

    const search = filters.search.trim();
    if (search) query = query.ilike("item_name", `%${search.replace(/[%,()]/g, " ")}%`);
    if (filters.supplierId !== "todos") query = query.eq("supplier_id", filters.supplierId);
    if (filters.kind !== "todos") query = query.eq("kind", filters.kind);
    if (filters.from) query = query.gte("purchase_date", filters.from);
    if (filters.to) query = query.lte("purchase_date", filters.to);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as Purchase[];
  },

  async create(input: PurchaseInput, companyId: string | null) {
    const { data: session } = await supabase.auth.getUser();
    const { error } = await supabase.from("purchases").insert({
      ...input,
      ...(companyId ? { company_id: companyId } : {}),
      created_by: session.user?.id ?? null,
    });
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("purchases").delete().eq("id", id);
    if (error) throw error;
  },
};
