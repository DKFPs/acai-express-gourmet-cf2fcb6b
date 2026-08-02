import { supabase } from "@/integrations/supabase/client";
import type {
  Ingredient,
  IngredientFilters,
  IngredientInput,
  MovementInput,
  StockMovement,
  SupplierInput,
  SupplierRow,
} from "@/types/stock";

const INGREDIENT_SELECT =
  "*, supplier:suppliers(id, name), category:categories(id, name, color)";

export interface IngredientListResult {
  items: Ingredient[];
  total: number;
}

export const ingredientService = {
  async list(filters: IngredientFilters): Promise<IngredientListResult> {
    let query = supabase
      .from("ingredients")
      .select(INGREDIENT_SELECT, { count: "exact" })
      .order("name", { ascending: true });

    const search = filters.search.trim();
    if (search) query = query.ilike("name", `%${search.replace(/[%,()]/g, " ")}%`);
    if (filters.supplierId !== "todos") query = query.eq("supplier_id", filters.supplierId);
    if (filters.categoryId !== "todas") query = query.eq("category_id", filters.categoryId);

    const { data, error, count } = await query;
    if (error) throw error;

    let rows = (data ?? []) as unknown as Ingredient[];
    if (filters.level === "critico") {
      rows = rows.filter((row) => Number(row.quantity) <= Number(row.min_stock));
    } else if (filters.level === "zerado") {
      rows = rows.filter((row) => Number(row.quantity) <= 0);
    }

    const total = filters.level === "todos" ? (count ?? rows.length) : rows.length;
    const from = (filters.page - 1) * filters.pageSize;
    return { items: rows.slice(from, from + filters.pageSize), total };
  },

  async all(): Promise<Ingredient[]> {
    const { data, error } = await supabase
      .from("ingredients")
      .select(INGREDIENT_SELECT)
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Ingredient[];
  },

  async create(input: IngredientInput, companyId: string | null) {
    const { error } = await supabase.from("ingredients").insert({ ...input, company_id: companyId ?? undefined });
    if (error) throw error;
  },

  async update(id: string, input: IngredientInput) {
    const { error } = await supabase.from("ingredients").update(input).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("ingredients").delete().eq("id", id);
    if (error) throw error;
  },
};

export const supplierService = {
  async list(): Promise<SupplierRow[]> {
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: SupplierInput, companyId: string | null) {
    const { error } = await supabase.from("suppliers").insert({ ...input, company_id: companyId ?? undefined });
    if (error) throw error;
  },

  async update(id: string, input: SupplierInput) {
    const { error } = await supabase.from("suppliers").update(input).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) throw error;
  },
};

export const movementService = {
  async list(params: {
    ingredientId?: string;
    type?: string;
    limit?: number;
  }): Promise<StockMovement[]> {
    let query = supabase
      .from("stock_movements")
      .select("*, ingredient:ingredients(id, name, unit)")
      .order("created_at", { ascending: false })
      .limit(params.limit ?? 100);

    if (params.ingredientId && params.ingredientId !== "todos") {
      query = query.eq("ingredient_id", params.ingredientId);
    }
    if (params.type && params.type !== "todos") {
      query = query.eq("type", params.type as "entrada" | "saida" | "ajuste");
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as StockMovement[];
  },

  async create(input: MovementInput, companyId: string | null) {
    const { data: session } = await supabase.auth.getUser();
    const { error } = await supabase.from("stock_movements").insert({
      ...input,
      company_id: companyId ?? undefined,
      created_by: session.user?.id ?? null,
    });
    if (error) throw error;
  },
};
