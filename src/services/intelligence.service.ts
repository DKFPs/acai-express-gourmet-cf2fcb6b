import { supabase } from "@/integrations/supabase/client";
import type {
  CustomerStat,
  FlavorStat,
  HourStat,
  IngredientCostStat,
  IntelligenceData,
  MarginStat,
  StockProjection,
  TrendPoint,
  WeekdayStat,
} from "@/types/intelligence";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date;
}

function dayKey(value: string) {
  return new Date(value).toISOString().slice(0, 10);
}

interface OrderRow {
  id: string;
  created_at: string;
  total: number | null;
  customer_id: string | null;
  customer_name: string | null;
}

interface ItemRow {
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number | null;
}

function buildFlavors(items: ItemRow[], costByProduct: Map<string, number>, costByName: Map<string, number>) {
  const map = new Map<string, FlavorStat>();
  for (const item of items) {
    const name = item.product_name;
    const entry = map.get(name) ?? { name, quantidade: 0, faturamento: 0, lucro: 0 };
    const quantity = Number(item.quantity ?? 0);
    const revenue = Number(item.line_total ?? Number(item.unit_price ?? 0) * quantity);
    const unitCost =
      (item.product_id ? costByProduct.get(item.product_id) : undefined) ??
      costByName.get(name.toLowerCase()) ??
      0;
    entry.quantidade += quantity;
    entry.faturamento += revenue;
    entry.lucro += revenue - unitCost * quantity;
    map.set(name, entry);
  }
  return [...map.values()].sort((a, b) => b.quantidade - a.quantidade);
}

export const intelligenceService = {
  async analyze(days = 30): Promise<IntelligenceData> {
    const start = daysAgo(days);
    const previousStart = daysAgo(days * 2);

    const [ordersRes, productsRes, recipesRes, ingredientsRes, packagingRes, movementsRes, packItemsRes, batchesRes, finishedRes] =
      await Promise.all([
        supabase
          .from("orders")
          .select("id, created_at, total, customer_id, customer_name")
          .neq("status", "cancelado")
          .gte("created_at", previousStart.toISOString())
          .order("created_at", { ascending: true }),
        supabase.from("products").select("id, name, price, cost"),
        supabase.from("recipes").select("id, name, cost_per_unit, sale_price"),
        supabase.from("ingredients").select("id, name, unit, quantity, purchase_price").eq("is_active", true),
        supabase.from("packaging_stock").select("id, name, unit, quantity, unit_cost").eq("is_active", true),
        supabase
          .from("stock_movements")
          .select("ingredient_id, type, quantity, unit_cost, created_at")
          .eq("type", "saida")
          .gte("created_at", start.toISOString()),
        supabase
          .from("production_items")
          .select("packaging_id, quantity, production_batches!inner(produced_at)")
          .not("packaging_id", "is", null)
          .gte("production_batches.produced_at", start.toISOString()),
        supabase
          .from("production_batches")
          .select("id, batch_code, expires_at, produced_quantity, discarded_quantity, status, recipes(name)")
          .not("expires_at", "is", null)
          .order("expires_at", { ascending: true })
          .limit(50),
        supabase.from("finished_products").select("recipe_id, name, quantity_available"),
      ]);

    for (const res of [ordersRes, productsRes, recipesRes, ingredientsRes, packagingRes, movementsRes, packItemsRes, batchesRes, finishedRes]) {
      if (res.error) throw res.error;
    }

    const allOrders = (ordersRes.data ?? []) as OrderRow[];
    const current = allOrders.filter((order) => new Date(order.created_at) >= start);
    const previous = allOrders.filter((order) => new Date(order.created_at) < start);

    const orderIds = allOrders.map((order) => order.id);
    let items: ItemRow[] = [];
    if (orderIds.length > 0) {
      const chunks: ItemRow[] = [];
      for (let i = 0; i < orderIds.length; i += 300) {
        const slice = orderIds.slice(i, i + 300);
        const { data, error } = await supabase
          .from("order_items")
          .select("order_id, product_id, product_name, quantity, unit_price, line_total")
          .in("order_id", slice);
        if (error) throw error;
        chunks.push(...((data ?? []) as ItemRow[]));
      }
      items = chunks;
    }

    const currentIds = new Set(current.map((order) => order.id));
    const currentItems = items.filter((item) => currentIds.has(item.order_id));
    const previousItems = items.filter((item) => !currentIds.has(item.order_id));

    const products = productsRes.data ?? [];
    const recipes = recipesRes.data ?? [];

    const costByProduct = new Map<string, number>(products.map((p) => [p.id, Number(p.cost ?? 0)]));
    const costByName = new Map<string, number>();
    for (const p of products) costByName.set(p.name.toLowerCase(), Number(p.cost ?? 0));
    for (const r of recipes) {
      if (!costByName.has(r.name.toLowerCase())) costByName.set(r.name.toLowerCase(), Number(r.cost_per_unit ?? 0));
    }

    const sabores = buildFlavors(currentItems, costByProduct, costByName);
    const saboresAnterior = buildFlavors(previousItems, costByProduct, costByName);

    const faturamento = current.reduce((sum, order) => sum + Number(order.total ?? 0), 0);
    const lucro = sabores.reduce((sum, flavor) => sum + flavor.lucro, 0);
    const lucroAnterior = saboresAnterior.reduce((sum, flavor) => sum + flavor.lucro, 0);

    // Horários
    const horaMap = new Map<number, HourStat>();
    for (let hour = 0; hour < 24; hour += 1) {
      horaMap.set(hour, { hora: `${String(hour).padStart(2, "0")}h`, faturamento: 0, pedidos: 0 });
    }
    const semanaMap = new Map<number, WeekdayStat>();
    WEEKDAYS.forEach((dia, index) => semanaMap.set(index, { dia, faturamento: 0, pedidos: 0 }));

    const clienteMap = new Map<string, CustomerStat>();
    const trendMap = new Map<string, TrendPoint>();

    for (const order of current) {
      const date = new Date(order.created_at);
      const total = Number(order.total ?? 0);

      const hour = horaMap.get(date.getHours())!;
      hour.faturamento += total;
      hour.pedidos += 1;

      const weekday = semanaMap.get(date.getDay())!;
      weekday.faturamento += total;
      weekday.pedidos += 1;

      const key = order.customer_id ?? order.customer_name ?? "Não identificado";
      const customer = clienteMap.get(key) ?? {
        name: order.customer_name ?? "Não identificado",
        total: 0,
        pedidos: 0,
      };
      customer.total += total;
      customer.pedidos += 1;
      clienteMap.set(key, customer);

      const day = dayKey(order.created_at);
      const point = trendMap.get(day) ?? { label: day.slice(8, 10) + "/" + day.slice(5, 7), receita: 0, custo: 0, lucro: 0 };
      point.receita += total;
      trendMap.set(day, point);
    }

    for (const item of currentItems) {
      const order = current.find((entry) => entry.id === item.order_id);
      if (!order) continue;
      const day = dayKey(order.created_at);
      const point = trendMap.get(day);
      if (!point) continue;
      const unitCost =
        (item.product_id ? costByProduct.get(item.product_id) : undefined) ??
        costByName.get(item.product_name.toLowerCase()) ??
        0;
      point.custo += unitCost * Number(item.quantity ?? 0);
    }
    for (const point of trendMap.values()) point.lucro = point.receita - point.custo;

    // Margens por produto
    const margens: MarginStat[] = products
      .filter((product) => Number(product.price ?? 0) > 0)
      .map((product) => {
        const price = Number(product.price ?? 0);
        const cost = Number(product.cost ?? 0);
        return { name: product.name, preco: price, custo: cost, margem: ((price - cost) / price) * 100 };
      })
      .sort((a, b) => b.margem - a.margem);

    // Custo por ingrediente (saídas do período)
    const ingredients = ingredientsRes.data ?? [];
    const nameById = new Map(ingredients.map((ing) => [ing.id, ing.name]));
    const consumoIngrediente = new Map<string, number>();
    const custoIngrediente = new Map<string, number>();
    for (const movement of movementsRes.data ?? []) {
      if (!movement.ingredient_id) continue;
      const quantity = Number(movement.quantity ?? 0);
      consumoIngrediente.set(movement.ingredient_id, (consumoIngrediente.get(movement.ingredient_id) ?? 0) + quantity);
      custoIngrediente.set(
        movement.ingredient_id,
        (custoIngrediente.get(movement.ingredient_id) ?? 0) + quantity * Number(movement.unit_cost ?? 0),
      );
    }

    const ingredientesCusto: IngredientCostStat[] = [...custoIngrediente.entries()]
      .map(([id, custo]) => ({ name: nameById.get(id) ?? "Ingrediente", custo }))
      .sort((a, b) => b.custo - a.custo)
      .slice(0, 8);

    // Projeções de estoque
    const projecoes: StockProjection[] = [];
    for (const ingredient of ingredients) {
      const consumo = (consumoIngrediente.get(ingredient.id) ?? 0) / days;
      projecoes.push({
        name: ingredient.name,
        tipo: "ingrediente",
        quantidade: Number(ingredient.quantity ?? 0),
        unidade: ingredient.unit,
        consumoDiario: consumo,
        diasRestantes: consumo > 0 ? Number(ingredient.quantity ?? 0) / consumo : null,
      });
    }

    const consumoEmbalagem = new Map<string, number>();
    for (const row of (packItemsRes.data ?? []) as { packaging_id: string | null; quantity: number }[]) {
      if (!row.packaging_id) continue;
      consumoEmbalagem.set(row.packaging_id, (consumoEmbalagem.get(row.packaging_id) ?? 0) + Number(row.quantity ?? 0));
    }
    for (const pack of packagingRes.data ?? []) {
      const consumo = (consumoEmbalagem.get(pack.id) ?? 0) / days;
      projecoes.push({
        name: pack.name,
        tipo: "embalagem",
        quantidade: Number(pack.quantity ?? 0),
        unidade: pack.unit,
        consumoDiario: consumo,
        diasRestantes: consumo > 0 ? Number(pack.quantity ?? 0) / consumo : null,
      });
    }
    projecoes.sort((a, b) => (a.diasRestantes ?? Infinity) - (b.diasRestantes ?? Infinity));

    const today = new Date();
    const lotesVencendo = ((batchesRes.data ?? []) as {
      batch_code: string | null;
      expires_at: string | null;
      produced_quantity: number;
      discarded_quantity: number;
      status: string;
      recipes: { name: string } | null;
    }[])
      .filter((batch) => batch.expires_at && batch.status !== "descartado")
      .map((batch) => ({
        name: batch.recipes?.name ?? "Lote",
        batch_code: batch.batch_code,
        expires_at: batch.expires_at as string,
        dias: Math.ceil((new Date(batch.expires_at as string).getTime() - today.getTime()) / 86400000),
      }))
      .filter((batch) => batch.dias <= 5)
      .slice(0, 5);

    return {
      dias: days,
      faturamento,
      lucro,
      lucroAnterior,
      pedidos: current.length,
      sabores,
      saboresAnterior,
      horas: [...horaMap.values()].filter((hour) => hour.pedidos > 0),
      semana: [...semanaMap.values()],
      clientes: [...clienteMap.values()].sort((a, b) => b.total - a.total).slice(0, 5),
      margens,
      ingredientes: ingredientesCusto,
      projecoes,
      tendencia: [...trendMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, point]) => point),
      lotesVencendo,
      prontos: (finishedRes.data ?? []).map((item) => ({
        recipe_id: item.recipe_id,
        name: item.name,
        disponivel: Number(item.quantity_available ?? 0),
      })),
    };
  },
};
