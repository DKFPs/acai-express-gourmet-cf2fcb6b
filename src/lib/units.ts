export type UnitFamily = "massa" | "volume" | "unidade";

const MASSA = ["mg", "g", "grama", "gramas", "kg", "quilo"];
const VOLUME = ["ml", "l", "lt", "litro", "litros"];

const FACTORS: Record<string, number> = {
  mg: 0.001,
  kg: 1000,
  quilo: 1000,
  l: 1000,
  lt: 1000,
  litro: 1000,
  litros: 1000,
};

function normalize(unit: string | null | undefined) {
  return String(unit ?? "un")
    .trim()
    .toLowerCase();
}

export function unitFamily(unit: string | null | undefined): UnitFamily {
  const value = normalize(unit);
  if (MASSA.includes(value)) return "massa";
  if (VOLUME.includes(value)) return "volume";
  return "unidade";
}

export function baseUnitOf(unit: string | null | undefined) {
  const family = unitFamily(unit);
  if (family === "massa") return "g";
  if (family === "volume") return "ml";
  return "un";
}

/** Quantas unidades base cabem em 1 unidade informada (kg -> 1000 g). */
export function unitFactor(unit: string | null | undefined) {
  return FACTORS[normalize(unit)] ?? 1;
}

/** Converte para a unidade base indicada. Se as famílias divergirem, mantém o valor. */
export function toBaseQty(qty: number, fromUnit: string, baseUnit: string) {
  if (!Number.isFinite(qty)) return 0;
  if (unitFamily(fromUnit) !== unitFamily(baseUnit)) return qty;
  return qty * unitFactor(fromUnit);
}

export function convertQty(qty: number, fromUnit: string, toUnit: string) {
  const base = toBaseQty(qty, fromUnit, baseUnitOf(toUnit));
  const factor = unitFactor(toUnit);
  return factor === 0 ? 0 : base / factor;
}

/** Unidades que o usuário pode escolher para um ingrediente comprado em `unit`. */
export function compatibleUnits(unit: string | null | undefined) {
  const family = unitFamily(unit);
  if (family === "massa") return ["g", "kg"];
  if (family === "volume") return ["ml", "l"];
  return ["un"];
}

export function isCompatible(a: string | null | undefined, b: string | null | undefined) {
  return unitFamily(a) === unitFamily(b);
}

const UNIT_LABEL: Record<string, string> = { g: "g", kg: "kg", ml: "ml", l: "L", un: "un" };

export function unitLabel(unit: string | null | undefined) {
  const value = normalize(unit);
  return UNIT_LABEL[value] ?? value;
}

/** Custo por unidade informada, a partir do custo por unidade base. */
export function costPerUnit(costPerBaseUnit: number, unit: string, baseUnit: string) {
  return costPerBaseUnit * toBaseQty(1, unit, baseUnit);
}

export function formatUnitCost(value: number, unit: string) {
  const digits = value > 0 && value < 0.1 ? 5 : value < 1 ? 4 : 2;
  return `${value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}/${unitLabel(unit)}`;
}

/** Tabela de custos derivados de um ingrediente (por g, kg, ml, L ou un). */
export function unitCostTable(costPerBaseUnit: number, baseUnit: string) {
  const family = unitFamily(baseUnit);
  if (family === "massa") {
    return [
      { unit: "g", value: costPerBaseUnit },
      { unit: "kg", value: costPerBaseUnit * 1000 },
    ];
  }
  if (family === "volume") {
    return [
      { unit: "ml", value: costPerBaseUnit },
      { unit: "l", value: costPerBaseUnit * 1000 },
    ];
  }
  return [{ unit: "un", value: costPerBaseUnit }];
}
