export interface SimulatorInput {
  ingredientsCost: number;
  packagingCost: number;
  quantity: number;
  salePrice: number;
  fixedCost: number;
  taxPercent: number;
}

export interface SimulatorResult {
  totalCost: number;
  unitCost: number;
  grossProfitUnit: number;
  netProfitUnit: number;
  grossProfit: number;
  netProfit: number;
  margin: number;
  markup: number;
  breakEvenUnits: number;
  batchProfit: number;
  revenue: number;
}

export function simulatePrice(input: SimulatorInput): SimulatorResult {
  const quantity = Math.max(input.quantity, 0);
  const variableCost = Math.max(input.ingredientsCost, 0) + Math.max(input.packagingCost, 0);
  const fixedCost = Math.max(input.fixedCost, 0);
  const totalCost = variableCost + fixedCost;
  const unitCost = quantity > 0 ? totalCost / quantity : 0;
  const variableUnit = quantity > 0 ? variableCost / quantity : 0;

  const salePrice = Math.max(input.salePrice, 0);
  const revenue = salePrice * quantity;
  const tax = (Math.max(input.taxPercent, 0) / 100) * salePrice;

  const grossProfitUnit = salePrice - unitCost;
  const netProfitUnit = grossProfitUnit - tax;
  const contribution = salePrice - variableUnit - tax;

  return {
    totalCost,
    unitCost,
    grossProfitUnit,
    netProfitUnit,
    grossProfit: grossProfitUnit * quantity,
    netProfit: netProfitUnit * quantity,
    margin: salePrice > 0 ? (netProfitUnit / salePrice) * 100 : 0,
    markup: unitCost > 0 ? ((salePrice - unitCost) / unitCost) * 100 : 0,
    breakEvenUnits: contribution > 0 ? Math.ceil(fixedCost / contribution) : 0,
    batchProfit: netProfitUnit * quantity,
    revenue,
  };
}

/** Preço mínimo para atingir a margem desejada sobre o preço de venda. */
export function minimumPrice(unitCost: number, targetMargin: number) {
  const margin = Math.min(Math.max(targetMargin, 0), 95);
  return margin >= 100 ? unitCost : unitCost / (1 - margin / 100);
}
