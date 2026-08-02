import { supabase } from "@/integrations/supabase/client";
import type {
  BatchLabelRow,
  BatchValidity,
  CommercialOverview,
  FlavorPerformance,
  ProductionOverview,
  ProductionPoint,
  RecipeCostHistoryRow,
  RecipePerformance,
} from "@/types/production-advanced";
import { validityStatus } from "@/types/production-advanced";

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function daysAgo(days: number) {
  const value = startOfDay();
  value.setDate(value.getDate() - days);
  return value;
}

interface BatchRow {
  id: string;
  batch_code: string | null;
  produced_at: string;
  expires_at: string | null;
  produced_quantity: number;
  discarded_quantity: number;
  total_cost: number;
  unit_cost: number;
  status: string;
  recipe_id: string;
  recipe: { id: string; name: string; sale_price: number; cost_per_unit: number } | null;
}

const BATCH_SELECT =
  "id, batch_code, produced_at, expires_at, produced_quantity, discarded_quantity, total_cost, unit_cost, status, recipe_id, recipe:recipes(id, name, sale_price, cost_per_unit)";

export const productionAnalyticsService = {
  async batchesSince(days = 60): Promise<BatchRow[]> {
    const { data, error } = await supabase
      .from("production_batches")
      .select(BATCH_SELECT)
      .gte("produced_at", daysAgo(days).toISOString())
      .order("produced_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as BatchRow[];
  },

  async overview(days = 60): Promise<ProductionOverview> {
    const batches = await this.batchesSince(days);

    const [{ data: finished }, { data: losses }] = await Promise.all([
      supabase.from("finished_products").select("quantity_available"),
      supabase
        .from("finished_product_movements")
        .select("quantity, created_at, batch_id")
        .eq("type", "descarte")
        .gte("created_at", daysAgo(days).toISOString()),
    ]);

    const today = startOfDay().getTime();
    const week = daysAgo(6).getTime();
    const month = daysAgo(29).getTime();

    let todayQty = 0;
    let weekQty = 0;
    let monthQty = 0;
    let costMonth = 0;
    let profitDay = 0;
    let profitMonth = 0;

    const seriesMap = new Map<string, ProductionPoint>();
    const recipeMap = new Map<string, RecipePerformance>();

    for (const batch of batches) {
      const at = new Date(batch.produced_at).getTime();
      const quantity = Number(batch.produced_quantity);
      const cost = Number(batch.total_cost);
      const salePrice = Number(batch.recipe?.sale_price ?? 0);
      const revenue = salePrice * quantity;
      const profit = revenue > 0 ? revenue - cost : 0;

      if (at >= today) {
        todayQty += quantity;
        profitDay += profit;
      }
      if (at >= week) weekQty += quantity;
      if (at >= month) {
        monthQty += quantity;
        costMonth += cost;
        profitMonth += profit;
      }

      const key = batch.produced_at.slice(0, 10);
      const point = seriesMap.get(key) ?? { date: key, quantity: 0, cost: 0 };
      point.quantity += quantity;
      point.cost += cost;
      seriesMap.set(key, point);

      const recipeId = batch.recipe?.id ?? batch.recipe_id;
      const performance =
        recipeMap.get(recipeId) ??
        ({
          recipe_id: recipeId,
          name: batch.recipe?.name ?? "Receita",
          quantity: 0,
          cost: 0,
          revenue: 0,
          profit: 0,
          margin: 0,
          batches: 0,
        } satisfies RecipePerformance);
      performance.quantity += quantity;
      performance.cost += cost;
      performance.revenue += revenue;
      performance.profit += profit;
      performance.batches += 1;
      recipeMap.set(recipeId, performance);
    }

    const recipes = [...recipeMap.values()].map((item) => ({
      ...item,
      margin: item.revenue > 0 ? ((item.revenue - item.cost) / item.revenue) * 100 : 0,
    }));

    const lossQty = (losses ?? []).reduce((sum, item) => sum + Number(item.quantity), 0);
    const batchCostById = new Map(batches.map((batch) => [batch.id, Number(batch.unit_cost)]));
    const lossValue = (losses ?? []).reduce(
      (sum, item) => sum + Number(item.quantity) * (batchCostById.get(item.batch_id ?? "") ?? 0),
      0,
    );
    const producedTotal = batches.reduce((sum, item) => sum + Number(item.produced_quantity), 0);

    return {
      today: todayQty,
      week: weekQty,
      month: monthQty,
      costMonth,
      profitDay,
      profitMonth,
      available: (finished ?? []).reduce((sum, item) => sum + Number(item.quantity_available), 0),
      losses: lossQty,
      lossValue,
      wastePercent: producedTotal > 0 ? (lossQty / producedTotal) * 100 : 0,
      series: [...seriesMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
      topRecipes: [...recipes].sort((a, b) => b.quantity - a.quantity).slice(0, 8),
      mostProfitable: [...recipes].sort((a, b) => b.profit - a.profit).slice(0, 5),
      leastProfitable: [...recipes].sort((a, b) => a.profit - b.profit).slice(0, 5),
    };
  },

  async validity(days = 120): Promise<BatchValidity[]> {
    const batches = await this.batchesSince(days);
    return batches.map((batch) => {
      const produced = Number(batch.produced_quantity);
      const discarded = Number(batch.discarded_quantity);
      const remaining = Math.max(produced - discarded, 0);
      const { status, daysLeft } = validityStatus(
        batch.expires_at,
        remaining,
        batch.status === "descartado",
      );
      return {
        id: batch.id,
        batch_code: batch.batch_code ?? batch.id.slice(0, 8),
        recipe_name: batch.recipe?.name ?? "Receita",
        produced_at: batch.produced_at,
        expires_at: batch.expires_at,
        produced_quantity: produced,
        discarded_quantity: discarded,
        remaining,
        unit_cost: Number(batch.unit_cost),
        days_left: daysLeft,
        status,
      } satisfies BatchValidity;
    });
  },

  async commercial(days = 30): Promise<CommercialOverview> {
    const { data, error } = await supabase
      .from("order_items")
      .select(
        "product_name, quantity, unit_price, product:products(cost), order:orders!inner(status, created_at)",
      )
      .gte("created_at", daysAgo(days).toISOString())
      .neq("order.status", "cancelado");
    if (error) throw error;

    const rows = (data ?? []) as unknown as {
      product_name: string;
      quantity: number;
      unit_price: number;
      product: { cost: number } | null;
    }[];

    const map = new Map<string, FlavorPerformance>();
    for (const row of rows) {
      const key = row.product_name;
      const entry =
        map.get(key) ??
        ({ name: key, quantity: 0, revenue: 0, cost: 0, profit: 0, margin: 0 } satisfies FlavorPerformance);
      const quantity = Number(row.quantity);
      entry.quantity += quantity;
      entry.revenue += quantity * Number(row.unit_price);
      entry.cost += quantity * Number(row.product?.cost ?? 0);
      map.set(key, entry);
    }

    const flavors = [...map.values()]
      .map((item) => {
        const profit = item.revenue - item.cost;
        return {
          ...item,
          profit,
          margin: item.revenue > 0 ? (profit / item.revenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.quantity - a.quantity);

    return {
      flavors,
      bestSellers: flavors.slice(0, 5),
      worstSellers: [...flavors].reverse().slice(0, 5),
      totalRevenue: flavors.reduce((sum, item) => sum + item.revenue, 0),
      totalProfit: flavors.reduce((sum, item) => sum + item.profit, 0),
      totalQuantity: flavors.reduce((sum, item) => sum + item.quantity, 0),
    };
  },

  async costHistory(recipeId?: string, limit = 100): Promise<RecipeCostHistoryRow[]> {
    let query = supabase
      .from("recipe_cost_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (recipeId) query = query.eq("recipe_id", recipeId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  async labels(limit = 60): Promise<BatchLabelRow[]> {
    const { data, error } = await supabase
      .from("batch_labels")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async batchDetail(batchId: string) {
    const { data, error } = await supabase
      .from("production_batches")
      .select(
        "*, recipe:recipes(id, name, bottle_volume_ml, sale_price, cost_per_unit), items:production_items(*), label:batch_labels(*)",
      )
      .eq("id", batchId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async discardBatch(batchId: string, quantity: number | null, reason: string) {
    const { error } = await supabase.rpc("discard_batch", {
      _batch_id: batchId,
      _quantity: quantity,
      _reason: reason,
    });
    if (error) throw error;
  },
};
