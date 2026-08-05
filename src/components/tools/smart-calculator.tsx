import { useEffect, useMemo, useState } from "react";
import { Calculator, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import { minimumPrice, simulatePrice } from "@/lib/production-simulator";
import type { Recipe } from "@/types/production";

interface Values {
  quantity: number;
  salePrice: number;
  acaiPrice: number;
  acaiQty: number;
  milkPrice: number;
  milkQty: number;
  packagingPrice: number;
  othersCost: number;
  fixedCost: number;
  taxPercent: number;
  targetMargin: number;
}

const INITIAL: Values = {
  quantity: 30,
  salePrice: 12,
  acaiPrice: 22,
  acaiQty: 10,
  milkPrice: 6,
  milkQty: 2,
  packagingPrice: 0.9,
  othersCost: 15,
  fixedCost: 0,
  taxPercent: 0,
  targetMargin: 55,
};

function matches(name: string, pattern: RegExp) {
  return pattern.test(
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
  );
}

/** Extrai açaí, leite, demais ingredientes e embalagem de uma receita cadastrada. */
function fromRecipe(recipe: Recipe): Values {
  const yieldQty = Math.max(Number(recipe.yield_quantity ?? 0), 1);
  let acaiQty = 0;
  let acaiPrice = INITIAL.acaiPrice;
  let milkQty = 0;
  let milkPrice = INITIAL.milkPrice;
  let others = 0;

  for (const item of recipe.items ?? []) {
    const name = item.ingredient?.name ?? "";
    const price = Number(item.ingredient?.purchase_price ?? 0);
    const quantity = Number(item.quantity ?? 0);
    if (matches(name, /acai/)) {
      acaiQty += quantity;
      if (price > 0) acaiPrice = price;
    } else if (matches(name, /leite/)) {
      milkQty += quantity;
      if (price > 0) milkPrice = price;
    } else {
      others += quantity * price;
    }
  }

  return {
    quantity: yieldQty,
    salePrice: Number(recipe.sale_price ?? 0) || INITIAL.salePrice,
    acaiPrice,
    acaiQty,
    milkPrice,
    milkQty,
    packagingPrice: Number(recipe.packaging_cost ?? 0) / yieldQty,
    othersCost: others,
    fixedCost: 0,
    taxPercent: 0,
    targetMargin: Number(recipe.target_margin_percent ?? 0) || INITIAL.targetMargin,
  };
}

export function SmartCalculator({ recipes }: { recipes: Recipe[] }) {
  const [recipeId, setRecipeId] = useState("manual");
  const [values, setValues] = useState<Values>(INITIAL);

  useEffect(() => {
    if (recipeId === "manual") return;
    const recipe = recipes.find((item) => item.id === recipeId);
    if (recipe) setValues(fromRecipe(recipe));
  }, [recipeId, recipes]);

  const set = (key: keyof Values) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [key]: Number(event.target.value) }));

  const result = useMemo(() => {
    const acai = values.acaiPrice * values.acaiQty;
    const milk = values.milkPrice * values.milkQty;
    const ingredientsCost = acai + milk + values.othersCost;
    const packagingCost = values.packagingPrice * values.quantity;
    const simulation = simulatePrice({
      ingredientsCost,
      packagingCost,
      quantity: values.quantity,
      salePrice: values.salePrice,
      fixedCost: values.fixedCost,
      taxPercent: values.taxPercent,
    });
    return {
      acai,
      milk,
      ingredientsCost,
      packagingCost,
      ...simulation,
      minimum: minimumPrice(simulation.unitCost, values.targetMargin),
    };
  }, [values]);

  const healthy = result.margin >= values.targetMargin;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-primary" />
            Calculadora inteligente de preço
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Base de cálculo</Label>
            <Select value={recipeId} onValueChange={setRecipeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Entrada manual</SelectItem>
                {recipes.map((recipe) => (
                  <SelectItem key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Ao escolher uma receita, os custos de açaí, leite, demais ingredientes e embalagem são
              preenchidos automaticamente.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Açaí — preço (R$/kg ou L)"
              value={values.acaiPrice}
              onChange={set("acaiPrice")}
            />
            <Field
              label="Açaí — quantidade do lote"
              value={values.acaiQty}
              onChange={set("acaiQty")}
            />
            <Field
              label="Leite — preço (R$/L)"
              value={values.milkPrice}
              onChange={set("milkPrice")}
            />
            <Field
              label="Leite — quantidade do lote"
              value={values.milkQty}
              onChange={set("milkQty")}
            />
            <Field
              label="Embalagem (R$/garrafinha)"
              value={values.packagingPrice}
              onChange={set("packagingPrice")}
            />
            <Field
              label="Outros ingredientes (R$/lote)"
              value={values.othersCost}
              onChange={set("othersCost")}
            />
            <Field
              label="Garrafinhas por lote"
              value={values.quantity}
              onChange={set("quantity")}
            />
            <Field
              label="Preço de venda (R$)"
              value={values.salePrice}
              onChange={set("salePrice")}
            />
            <Field
              label="Custos fixos do lote (R$)"
              value={values.fixedCost}
              onChange={set("fixedCost")}
            />
            <Field
              label="Taxas sobre venda (%)"
              value={values.taxPercent}
              onChange={set("taxPercent")}
            />
            <Field
              label="Margem desejada (%)"
              value={values.targetMargin}
              onChange={set("targetMargin")}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Resultado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Custo total do lote" value={formatCurrency(result.totalCost)} />
            <Metric label="Custo por garrafinha" value={formatCurrency(result.unitCost)} />
            <Metric
              label="Lucro por garrafinha"
              value={formatCurrency(result.netProfitUnit)}
              tone={result.netProfitUnit < 0 ? "bad" : "good"}
            />
            <Metric
              label="Lucro do lote"
              value={formatCurrency(result.batchProfit)}
              tone={result.batchProfit < 0 ? "bad" : "good"}
            />
            <Metric label="Faturamento do lote" value={formatCurrency(result.revenue)} />
            <Metric label="Preço mínimo sugerido" value={formatCurrency(result.minimum)} />
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Margem atual</span>
              <Badge variant={healthy ? "secondary" : "destructive"}>
                {formatPercent(result.margin)}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {healthy
                ? `Preço saudável: acima da margem desejada de ${formatPercent(values.targetMargin)}.`
                : `Para atingir ${formatPercent(values.targetMargin)} de margem, venda a partir de ${formatCurrency(result.minimum)}.`}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Markup {formatPercent(result.markup)} · Ponto de equilíbrio{" "}
              {formatNumber(result.breakEvenUnits)} garrafinhas
            </p>
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>Açaí: {formatCurrency(result.acai)}</p>
            <p>Leite: {formatCurrency(result.milk)}</p>
            <p>Outros ingredientes: {formatCurrency(values.othersCost)}</p>
            <p>Embalagens: {formatCurrency(result.packagingCost)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        step="0.01"
        value={Number.isFinite(value) ? value : 0}
        onChange={onChange}
      />
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          tone === "bad" ? "text-destructive" : tone === "good" ? "text-primary" : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
