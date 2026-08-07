import { supabase } from "@/integrations/supabase/client";
import { movementsService } from "@/services/movements.service";
import type {
  FinishedMovement,
  FinishedMovementInput,
  FinishedProduct,
  PackagingInput,
  PackagingRow,
  ProduceInput,
  ProductionBatch,
  Recipe,
  RecipeInput,
} from "@/types/production";

const RECIPE_SELECT =
  "*, category:categories(id, name, color), items:recipe_items(*, ingredient:ingredients(id, name, unit, purchase_price))";

export const recipeService = {
  async list(search = ""): Promise<Recipe[]> {
    let query = supabase.from("recipes").select(RECIPE_SELECT).order("name", { ascending: true });
    const term = search.trim();
    if (term) query = query.ilike("name", `%${term.replace(/[%,()]/g, " ")}%`);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as unknown as Recipe[];
  },

  async create(input: RecipeInput, companyId: string) {
    const { items, ...recipe } = input;
    const { data, error } = await supabase
      .from("recipes")
      .insert({ ...recipe, company_id: companyId })
      .select("id")
      .single();
    if (error) throw error;
    await this.saveItems(data.id, items);
  },

  async update(id: string, input: RecipeInput) {
    const { items, ...recipe } = input;
    const { error } = await supabase.from("recipes").update(recipe).eq("id", id);
    if (error) throw error;
    await this.saveItems(id, items);
  },

  async saveItems(recipeId: string, items: RecipeInput["items"]) {
    const { error: deleteError } = await supabase
      .from("recipe_items")
      .delete()
      .eq("recipe_id", recipeId);
    if (deleteError) throw deleteError;
    if (items.length === 0) return;
    const { error } = await supabase.from("recipe_items").insert(
      items.map((item, index) => ({
        recipe_id: recipeId,
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        sort_order: index,
      })),
    );
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("recipes").delete().eq("id", id);
    if (error) throw error;
  },
};

export const packagingService = {
  async list(): Promise<PackagingRow[]> {
    const { data, error } = await supabase
      .from("packaging_stock")
      .select("*")
      .order("type", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async create(input: PackagingInput, companyId: string) {
    const { error } = await supabase
      .from("packaging_stock")
      .insert({ ...input, company_id: companyId });
    if (error) throw error;
  },

  async update(id: string, input: PackagingInput) {
    const { error } = await supabase.from("packaging_stock").update(input).eq("id", id);
    if (error) throw error;
  },

  async remove(id: string) {
    const { error } = await supabase.from("packaging_stock").delete().eq("id", id);
    if (error) throw error;
  },
};

export const productionService = {
  async batches(limit = 100): Promise<ProductionBatch[]> {
    const { data, error } = await supabase
      .from("production_batches")
      .select("*, recipe:recipes(id, name), items:production_items(*)")
      .order("produced_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as ProductionBatch[];
  },

  async produce(input: ProduceInput) {
    const { data, error } = await supabase.rpc("produce_batch", {
      _recipe_id: input.recipe_id,
      _batches: input.batches,
      _produced_at: input.produced_at,
      ...(input.notes ? { _notes: input.notes } : {}),
    });
    if (error) throw error;
    return data as string;
  },
};

export const finishedProductService = {
  async list(): Promise<FinishedProduct[]> {
    const { data, error } = await supabase
      .from("finished_products")
      .select("*, recipe:recipes(id, name)")
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as FinishedProduct[];
  },

  async movements(limit = 150): Promise<FinishedMovement[]> {
    const { data, error } = await supabase
      .from("finished_product_movements")
      .select("*, finished_product:finished_products(id, name)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []) as unknown as FinishedMovement[];
  },

  /** Movimentações de produto acabado passam pelo Núcleo de Movimentações. */
  async createMovement(input: FinishedMovementInput) {
    await movementsService.finished({
      finished_product_id: input.finished_product_id,
      type: input.type,
      quantity: input.quantity,
      reason: input.reason,
    });
  },
};
