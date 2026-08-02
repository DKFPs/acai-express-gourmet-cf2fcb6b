import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { simulatePrice } from "@/lib/production-simulator";
import type { Recipe } from "@/types/production";

interface Field {
  key: keyof State;
  label: string;
  hint?: string;
}

interface State {
  ingredientsCost: string;
  packagingCost: string;
  quantity: string;
  salePrice: string;
  fixedCost: string;
  taxPercent: string;
}

const FIELDS: Field[] = [
  { key: "ingredientsCost", label: "Custo dos ingredientes (lote)" },
  { key: "packagingCost", label: "Custo das embalagens (lote)" },
  { key: "quantity", label: "Quantidade produzida (un)" },
  { key: "salePrice", label: "Preço de venda (un)" },
  { key: "fixedCost", label: "Custos fixos do lote", hint: "gás, energia, mão de obra" },
  { key: "taxPercent", label: "Taxas e impostos (%)", hint: "maquininha, delivery" },
];

const INITIAL: State = {
  ingredientsCost: "0",
  packagingCost: "0",
  quantity: "10",
  salePrice: "0",
  fixedCost: "0",
  taxPercent: "0",
};

export function PriceSimulator({ recipes }: { recipes: Recipe[] }) {
  const [state, setState] = useState<State>(INITIAL);

  const result = useMemo(
    () =>
      simulatePrice({
        ingredientsCost: Number(state.ingredientsCost) || 0,
        packagingCost: Number(state.packagingCost) || 0,
        quantity: Number(state.quantity) || 0,
        salePrice: Number(state.salePrice) || 0,
        fixedCost: Number(state.fixedCost) || 0,
        taxPercent: Number(state.taxPercent) || 0,
      }),
    [state],
  );

  const loadRecipe = (id: string) => {
    const recipe = recipes.find((item) => item.id === id);
    if (!recipe) return;
    setState((current) => ({
      ...current,
      ingredientsCost: String(Number(recipe.ingredients_cost ?? 0)),
      packagingCost: String(Number(recipe.packaging_cost ?? 0)),
      quantity: String(Number(recipe.yield_quantity ?? 1)),
      salePrice: String(Number(recipe.sale_price ?? 0) || Number(recipe.min_sale_price ?? 0)),
    }));
  };

  const metrics = [
    { label: "Custo total", value: formatCurrency(result.totalCost) },
    { label: "Custo unitário", value: formatCurrency(result.unitCost) },
    { label: "Receita do lote", value: formatCurrency(result.revenue) },
    { label: "Lucro bruto (un)", value: formatCurrency(result.grossProfitUnit) },
    { label: "Lucro líquido (un)", value: formatCurrency(result.netProfitUnit) },
    { label: "Lucro total do lote", value: formatCurrency(result.batchProfit) },
    { label: "Margem", value: formatPercent(result.margin) },
    { label: "Markup", value: formatPercent(result.markup) },
    {
      label: "Ponto de equilíbrio",
      value: result.breakEvenUnits > 0 ? `${formatNumber(result.breakEvenUnits)} un` : "—",
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1.1fr]">
      <Card className="rounded-2xl">
        <CardHeader className="flex-row items-center gap-2 pb-2">
          <Calculator className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Dados da simulação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-1.5">
            <Label>Carregar de uma receita</Label>
            <Select onValueChange={loadRecipe}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma receita (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {recipes.map((recipe) => (
                  <SelectItem key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key} className="grid gap-1.5">
                <Label htmlFor={`sim-${field.key}`}>{field.label}</Label>
                <Input
                  id={`sim-${field.key}`}
                  inputMode="decimal"
                  value={state[field.key]}
                  onChange={(event) =>
                    setState((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
                {field.hint ? (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                ) : null}
              </div>
            ))}
          </div>

          <Button variant="ghost" onClick={() => setState(INITIAL)}>
            Limpar
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Resultado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border/60 p-3">
              <p className="text-xs text-muted-foreground">{metric.label}</p>
              <p className="text-lg font-semibold">{metric.value}</p>
            </div>
          ))}
          {result.netProfitUnit < 0 ? (
            <p className="sm:col-span-3 text-sm font-medium text-destructive">
              Atenção: com esse preço o produto dá prejuízo.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
