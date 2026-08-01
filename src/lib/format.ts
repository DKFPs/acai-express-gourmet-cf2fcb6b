export const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (numeric === null || numeric === undefined || Number.isNaN(numeric)) return "—";
  return currency.format(numeric);
}

export function formatNumber(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (numeric === null || numeric === undefined || Number.isNaN(numeric)) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(numeric);
}

export function formatPercent(value: number | string | null | undefined) {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (numeric === null || numeric === undefined || Number.isNaN(numeric)) return "—";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(numeric)}%`;
}

/** Margem de lucro sobre o preço de venda efetivo (mesma regra do banco). */
export function calcMargin(price: number, cost: number, promoPrice?: number | null) {
  const effective = promoPrice && promoPrice > 0 ? promoPrice : price;
  if (!effective || effective <= 0) return 0;
  return Math.round(((effective - cost) / effective) * 10000) / 100;
}
