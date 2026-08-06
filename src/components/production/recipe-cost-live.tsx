import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CostingResult } from "@/lib/recipe-costing";
import { formatUnitCost, unitLabel } from "@/lib/units";

/** Tabela inteligente de ingredientes + embalagens, alimentada pelo motor central. */
export function RecipeCostTable({ costing }: { costing: CostingResult }) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingrediente</TableHead>
              <TableHead className="text-right">Qtd. usada</TableHead>
              <TableHead>Un.</TableHead>
              <TableHead className="text-right">Em estoque</TableHead>
              <TableHead className="text-right">Custo unitário</TableHead>
              <TableHead className="text-right">Valor consumido</TableHead>
              <TableHead className="text-right">% do custo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costing.ingredientLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Selecione os ingredientes para ver o custo.
                </TableCell>
              </TableRow>
            ) : (
              costing.ingredientLines.map((line) => (
                <TableRow
                  key={line.id}
                  className={cn(line.missing && "bg-destructive/10 text-destructive")}
                >
                  <TableCell className="font-medium">{line.name}</TableCell>
                  <TableCell className="text-right">{formatNumber(line.quantity)}</TableCell>
                  <TableCell>{unitLabel(line.unit)}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(line.stockQuantity)} {unitLabel(line.unit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatUnitCost(line.unitCost, line.unit)}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(line.totalCost)}</TableCell>
                  <TableCell className="text-right">{formatPercent(line.costPercent)}</TableCell>
                </TableRow>
              ))
            )}
            {costing.packagingLines.map((line) => (
              <TableRow
                key={line.id}
                className={cn(
                  "bg-muted/30",
                  line.missing && "bg-destructive/10 text-destructive",
                )}
              >
                <TableCell className="font-medium">{line.name} (embalagem)</TableCell>
                <TableCell className="text-right">{formatNumber(line.quantity)}</TableCell>
                <TableCell>{unitLabel(line.unit)}</TableCell>
                <TableCell className="text-right">
                  {formatNumber(line.stockQuantity)} {unitLabel(line.unit)}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(line.unitCost)}</TableCell>
                <TableCell className="text-right">{formatCurrency(line.totalCost)}</TableCell>
                <TableCell className="text-right">{formatPercent(line.costPercent)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {costing.validation.errors.length > 0 ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTriangle className="size-4" />
          <AlertTitle>Produção bloqueada</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-1 pl-4">
              {costing.validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}

/** Painel de custos em tempo real. */
export function RecipeCostSummary({
  costing,
  className,
}: {
  costing: CostingResult;
  className?: string;
}) {
  const rows: { label: string; value: string; strong?: boolean; danger?: boolean }[] = [
    { label: "Quantidade produzida", value: `${formatNumber(costing.produced)} un` },
    { label: "Custo dos ingredientes", value: formatCurrency(costing.ingredientsCost) },
    { label: "Custo das embalagens", value: formatCurrency(costing.packagingCost) },
    { label: "Custo total da receita", value: formatCurrency(costing.totalCost), strong: true },
    { label: "Custo por garrafinha", value: formatCurrency(costing.costPerBottle), strong: true },
    { label: "Preço de venda", value: formatCurrency(costing.salePrice) },
    { label: "Preço mínimo sugerido", value: formatCurrency(costing.minSalePrice) },
    {
      label: "Lucro por garrafinha",
      value: formatCurrency(costing.netProfitPerBottle),
      strong: true,
      danger: costing.netProfitPerBottle <= 0,
    },
    {
      label: "Lucro do lote",
      value: formatCurrency(costing.batchProfit),
      danger: costing.batchProfit <= 0,
    },
    { label: "Faturamento do lote", value: formatCurrency(costing.batchRevenue) },
    {
      label: "Margem",
      value: formatPercent(costing.marginPercent),
      danger: costing.marginPercent <= 0,
    },
    { label: "Markup", value: `${costing.markup.toFixed(2)}x` },
  ];

  return (
    <aside
      className={cn(
        "space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-4 text-sm",
        className,
      )}
    >
      <p className="text-sm font-semibold">Custos em tempo real</p>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{row.label}</span>
          <span
            className={cn(
              row.strong && "font-semibold",
              row.danger ? "text-destructive" : undefined,
            )}
          >
            {row.value}
          </span>
        </div>
      ))}
    </aside>
  );
}
