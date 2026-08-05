import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { Recipe } from "@/types/production";
import type { RecipeCostHistoryRow } from "@/types/production-advanced";

export function RecipeCostsPanel({
  recipes,
  history,
}: {
  recipes: Recipe[];
  history: RecipeCostHistoryRow[];
}) {
  const names = useMemo(
    () => new Map(recipes.map((recipe) => [recipe.id, recipe.name])),
    [recipes],
  );

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Custos inteligentes por receita</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receita</TableHead>
                  <TableHead>Ingredientes</TableHead>
                  <TableHead>Embalagens</TableHead>
                  <TableHead>Custo total</TableHead>
                  <TableHead>Custo/garrafinha</TableHead>
                  <TableHead>Preço mínimo</TableHead>
                  <TableHead>Preço de venda</TableHead>
                  <TableHead>Lucro/un</TableHead>
                  <TableHead>Lucro/lote</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((recipe) => {
                  const margin = Number(recipe.margin_percent ?? 0);
                  const profitUnit = Number(recipe.profit_per_unit ?? 0);
                  const salePrice = Number(recipe.sale_price ?? 0);
                  return (
                    <TableRow key={recipe.id}>
                      <TableCell className="font-medium">{recipe.name}</TableCell>
                      <TableCell>{formatCurrency(Number(recipe.ingredients_cost ?? 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(recipe.packaging_cost ?? 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(recipe.total_cost ?? 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(recipe.cost_per_unit ?? 0))}</TableCell>
                      <TableCell>{formatCurrency(Number(recipe.min_sale_price ?? 0))}</TableCell>
                      <TableCell>
                        {salePrice > 0 ? formatCurrency(salePrice) : "não definido"}
                      </TableCell>
                      <TableCell className={profitUnit < 0 ? "text-destructive" : undefined}>
                        {formatCurrency(profitUnit)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(profitUnit * Number(recipe.yield_quantity ?? 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            salePrice <= 0 ? "outline" : margin < 40 ? "destructive" : "secondary"
                          }
                        >
                          {salePrice > 0 ? formatPercent(margin) : "—"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {recipes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      Cadastre uma receita para acompanhar os custos.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico de custos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Custo total</TableHead>
                <TableHead>Custo/un</TableHead>
                <TableHead>Preço mínimo</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry, index) => {
                const previous = history
                  .slice(index + 1)
                  .find((item) => item.recipe_id === entry.recipe_id);
                const delta = previous ? Number(entry.total_cost) - Number(previous.total_cost) : 0;
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      {new Date(entry.created_at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {names.get(entry.recipe_id) ?? "Receita"}
                    </TableCell>
                    <TableCell className="flex items-center gap-1">
                      {formatCurrency(Number(entry.total_cost))}
                      {delta !== 0 ? (
                        delta > 0 ? (
                          <TrendingUp className="size-3 text-destructive" />
                        ) : (
                          <TrendingDown className="size-3 text-emerald-500" />
                        )
                      ) : null}
                    </TableCell>
                    <TableCell>{formatCurrency(Number(entry.cost_per_unit))}</TableCell>
                    <TableCell>{formatCurrency(Number(entry.min_sale_price))}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.reason ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
              {history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhuma alteração de custo registrada.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          <p className="px-4 py-3 text-xs text-muted-foreground">
            {formatNumber(history.length)} registros — recalculados automaticamente quando o preço
            de um ingrediente ou embalagem muda.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
