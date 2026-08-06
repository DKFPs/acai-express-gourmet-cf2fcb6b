import { baseUnitOf, convertQty, costPerUnit, toBaseQty } from "@/lib/units";

export interface CostingIngredient {
  id: string;
  name: string;
  /** unidade de estoque/compra do ingrediente */
  stockUnit: string;
  baseUnit: string;
  costPerBaseUnit: number;
  stockQuantity: number;
}

export interface CostingRecipeItem {
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface CostingPackaging {
  id: string;
  name: string;
  unit: string;
  unitCost: number;
  qtyPerUnit: number;
  stockQuantity: number;
}

export interface CostingParams {
  items: CostingRecipeItem[];
  ingredients: CostingIngredient[];
  packaging: CostingPackaging[];
  /** rendimento real: garrafinhas produzidas por lote */
  yieldQuantity: number;
  salePrice: number;
  targetMarginPercent: number;
  salesTaxPercent: number;
  /** quantidade de lotes (produção); padrão 1 */
  batches?: number;
}

export interface CostingLine {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  stockQuantity: number;
  missing: boolean;
  /** participação da linha no custo total da receita (%) */
  costPercent: number;
}

export interface CostingValidation {
  ok: boolean;
  errors: string[];
}

export interface CostingResult {
  ingredientLines: CostingLine[];
  packagingLines: CostingLine[];
  ingredientsCost: number;
  packagingCost: number;
  packagingCostPerBottle: number;
  totalCost: number;
  produced: number;
  costPerBottle: number;
  salePrice: number;
  grossProfitPerBottle: number;
  taxPerBottle: number;
  netProfitPerBottle: number;
  batchProfit: number;
  batchRevenue: number;
  marginPercent: number;
  markup: number;
  minSalePrice: number;
  missing: CostingLine[];
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const safe = (value: number) => (Number.isFinite(value) ? value : 0);

export function calculateRecipeCosts(params: CostingParams): CostingResult {
  const batches = params.batches && params.batches > 0 ? params.batches : 1;
  const yieldQty = safe(params.yieldQuantity);
  const produced = yieldQty * batches;

  const ingredientLines: CostingLine[] = params.items
    .filter((item) => item.ingredientId)
    .map((item, index) => {
      const ingredient = params.ingredients.find((entry) => entry.id === item.ingredientId);
      const baseUnit = ingredient?.baseUnit ?? baseUnitOf(item.unit);
      const perUnit = ingredient ? costPerUnit(ingredient.costPerBaseUnit, item.unit, baseUnit) : 0;
      const quantity = safe(item.quantity) * batches;
      const neededInStockUnit = ingredient
        ? convertQty(quantity, item.unit, ingredient.stockUnit)
        : quantity;
      return {
        id: `${item.ingredientId}-${index}`,
        name: ingredient?.name ?? "Ingrediente",
        quantity,
        unit: item.unit,
        unitCost: safe(perUnit),
        totalCost: safe(quantity * perUnit),
        stockQuantity: ingredient
          ? safe(convertQty(ingredient.stockQuantity, ingredient.stockUnit, item.unit))
          : 0,
        missing: ingredient ? ingredient.stockQuantity < neededInStockUnit : false,
      };
    });

  const packagingLines: CostingLine[] = params.packaging
    .filter((entry) => entry.qtyPerUnit > 0)
    .map((entry) => {
      const quantity = entry.qtyPerUnit * produced;
      return {
        id: entry.id,
        name: entry.name,
        quantity,
        unit: entry.unit,
        unitCost: safe(entry.unitCost),
        totalCost: safe(quantity * entry.unitCost),
        stockQuantity: safe(entry.stockQuantity),
        missing: entry.stockQuantity < quantity,
      };
    });

  const ingredientsCost = ingredientLines.reduce((sum, line) => sum + line.totalCost, 0);
  const packagingCost = packagingLines.reduce((sum, line) => sum + line.totalCost, 0);
  const packagingCostPerBottle = produced > 0 ? packagingCost / produced : 0;
  const totalCost = ingredientsCost + packagingCost;
  const costPerBottle = produced > 0 ? totalCost / produced : 0;

  const salePrice = safe(params.salePrice);
  const tax = clamp(safe(params.salesTaxPercent), 0, 95);
  const target = clamp(safe(params.targetMarginPercent), 0, 95);

  const grossProfitPerBottle = salePrice > 0 ? salePrice - costPerBottle : 0;
  const taxPerBottle = (salePrice * tax) / 100;
  const netProfitPerBottle = salePrice > 0 ? grossProfitPerBottle - taxPerBottle : 0;
  const marginPercent = salePrice > 0 ? (netProfitPerBottle / salePrice) * 100 : 0;
  const markup = costPerBottle > 0 && salePrice > 0 ? salePrice / costPerBottle : 0;
  const minSalePrice =
    target + tax < 100 ? costPerBottle / (1 - (target + tax) / 100) : costPerBottle;

  return {
    ingredientLines,
    packagingLines,
    ingredientsCost,
    packagingCost,
    packagingCostPerBottle,
    totalCost,
    produced,
    costPerBottle,
    salePrice,
    grossProfitPerBottle,
    taxPerBottle,
    netProfitPerBottle,
    batchProfit: netProfitPerBottle * produced,
    batchRevenue: salePrice * produced,
    marginPercent,
    markup,
    minSalePrice,
    missing: [...ingredientLines, ...packagingLines].filter((line) => line.missing),
  };
}

export function toCostingIngredients(
  rows: {
    id: string;
    name: string;
    unit: string;
    base_unit?: string | null;
    cost_per_base_unit?: number | null;
    purchase_price: number;
    quantity: number;
  }[],
): CostingIngredient[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    stockUnit: row.unit,
    baseUnit: row.base_unit ?? baseUnitOf(row.unit),
    costPerBaseUnit:
      row.cost_per_base_unit ?? row.purchase_price / (toBaseQty(1, row.unit, baseUnitOf(row.unit)) || 1),
    stockQuantity: row.quantity,
  }));
}

export function toCostingPackaging(
  rows: {
    id: string;
    name: string;
    unit: string;
    unit_cost: number;
    qty_per_unit?: number | null;
    quantity: number;
    is_active: boolean;
  }[],
): CostingPackaging[] {
  return rows
    .filter((row) => row.is_active)
    .map((row) => ({
      id: row.id,
      name: row.name,
      unit: row.unit,
      unitCost: row.unit_cost,
      qtyPerUnit: row.qty_per_unit ?? 1,
      stockQuantity: row.quantity,
    }));
}
