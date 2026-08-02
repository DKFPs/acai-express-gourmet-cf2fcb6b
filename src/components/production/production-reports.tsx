import { FileDown, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import {
  exportProductionExcel,
  exportProductionPdf,
  type SimpleReport,
} from "@/lib/production-export";
import type { Recipe } from "@/types/production";
import type {
  BatchValidity,
  CommercialOverview,
  ProductionOverview,
  RecipeCostHistoryRow,
} from "@/types/production-advanced";
import { VALIDITY_LABELS } from "@/types/production-advanced";

interface Props {
  overview: ProductionOverview | undefined;
  commercial: CommercialOverview | undefined;
  validity: BatchValidity[];
  recipes: Recipe[];
  history: RecipeCostHistoryRow[];
}

function buildReports({ overview, commercial, validity, recipes, history }: Props): SimpleReport[] {
  const subtitle = `Gerado em ${new Date().toLocaleString("pt-BR")}`;
  const reports: SimpleReport[] = [];

  reports.push({
    slug: "producao",
    title: "Relatório de Produção",
    subtitle,
    kpis: [
      { label: "Hoje", value: `${formatNumber(overview?.today ?? 0)} un` },
      { label: "Semana", value: `${formatNumber(overview?.week ?? 0)} un` },
      { label: "Mês", value: `${formatNumber(overview?.month ?? 0)} un` },
      { label: "Disponível", value: `${formatNumber(overview?.available ?? 0)} un` },
    ],
    columns: [
      { key: "receita", label: "Receita" },
      { key: "lotes", label: "Lotes" },
      { key: "quantidade", label: "Unidades" },
      { key: "custo", label: "Custo" },
    ],
    rows: (overview?.topRecipes ?? []).map((item) => ({
      receita: item.name,
      lotes: item.batches,
      quantidade: item.quantity,
      custo: formatCurrency(item.cost),
    })),
  });

  reports.push({
    slug: "custos",
    title: "Relatório de Custos",
    subtitle,
    kpis: [{ label: "Receitas", value: String(recipes.length) }],
    columns: [
      { key: "receita", label: "Receita" },
      { key: "ingredientes", label: "Ingredientes" },
      { key: "embalagens", label: "Embalagens" },
      { key: "total", label: "Custo total" },
      { key: "unitario", label: "Custo/un" },
      { key: "minimo", label: "Preço mínimo" },
    ],
    rows: recipes.map((recipe) => ({
      receita: recipe.name,
      ingredientes: formatCurrency(Number(recipe.ingredients_cost ?? 0)),
      embalagens: formatCurrency(Number(recipe.packaging_cost ?? 0)),
      total: formatCurrency(Number(recipe.total_cost ?? 0)),
      unitario: formatCurrency(Number(recipe.cost_per_unit ?? 0)),
      minimo: formatCurrency(Number(recipe.min_sale_price ?? 0)),
    })),
  });

  reports.push({
    slug: "lucro",
    title: "Relatório de Lucro",
    subtitle,
    kpis: [
      { label: "Lucro do dia", value: formatCurrency(overview?.profitDay ?? 0) },
      { label: "Lucro do mês", value: formatCurrency(overview?.profitMonth ?? 0) },
      { label: "Receita comercial", value: formatCurrency(commercial?.totalRevenue ?? 0) },
      { label: "Lucro comercial", value: formatCurrency(commercial?.totalProfit ?? 0) },
    ],
    columns: [
      { key: "sabor", label: "Sabor" },
      { key: "quantidade", label: "Vendidos" },
      { key: "receita", label: "Receita" },
      { key: "lucro", label: "Lucro" },
      { key: "margem", label: "Margem" },
    ],
    rows: (commercial?.flavors ?? []).map((item) => ({
      sabor: item.name,
      quantidade: item.quantity,
      receita: formatCurrency(item.revenue),
      lucro: formatCurrency(item.profit),
      margem: formatPercent(item.margin),
    })),
  });

  reports.push({
    slug: "perdas",
    title: "Relatório de Perdas",
    subtitle,
    kpis: [
      { label: "Unidades perdidas", value: formatNumber(overview?.losses ?? 0) },
      { label: "Valor das perdas", value: formatCurrency(overview?.lossValue ?? 0) },
      { label: "Desperdício", value: formatPercent(overview?.wastePercent ?? 0) },
    ],
    columns: [
      { key: "lote", label: "Lote" },
      { key: "sabor", label: "Sabor" },
      { key: "descartado", label: "Descartado" },
      { key: "perda", label: "Valor" },
    ],
    rows: validity
      .filter((batch) => batch.discarded_quantity > 0)
      .map((batch) => ({
        lote: batch.batch_code,
        sabor: batch.recipe_name,
        descartado: batch.discarded_quantity,
        perda: formatCurrency(batch.discarded_quantity * batch.unit_cost),
      })),
  });

  reports.push({
    slug: "validade",
    title: "Relatório de Validade",
    subtitle,
    kpis: [
      {
        label: "Vencidos",
        value: String(validity.filter((item) => item.status === "vencido").length),
      },
      {
        label: "Próximos",
        value: String(
          validity.filter((item) => item.status === "critico" || item.status === "atencao").length,
        ),
      },
    ],
    columns: [
      { key: "lote", label: "Lote" },
      { key: "sabor", label: "Sabor" },
      { key: "fabricacao", label: "Fabricação" },
      { key: "validade", label: "Validade" },
      { key: "dias", label: "Dias restantes" },
      { key: "restante", label: "Restante" },
      { key: "situacao", label: "Situação" },
    ],
    rows: validity.map((batch) => ({
      lote: batch.batch_code,
      sabor: batch.recipe_name,
      fabricacao: new Date(batch.produced_at).toLocaleDateString("pt-BR"),
      validade: batch.expires_at ?? "—",
      dias: batch.days_left ?? "—",
      restante: batch.remaining,
      situacao: VALIDITY_LABELS[batch.status],
    })),
  });

  reports.push({
    slug: "receitas",
    title: "Relatório de Receitas",
    subtitle,
    kpis: [{ label: "Alterações de custo", value: String(history.length) }],
    columns: [
      { key: "receita", label: "Receita" },
      { key: "volume", label: "Volume (ml)" },
      { key: "rendimento", label: "Rendimento" },
      { key: "validade", label: "Validade (dias)" },
      { key: "preco", label: "Preço de venda" },
      { key: "margem", label: "Margem" },
    ],
    rows: recipes.map((recipe) => ({
      receita: recipe.name,
      volume: Number(recipe.bottle_volume_ml),
      rendimento: Number(recipe.yield_quantity),
      validade: Number(recipe.shelf_life_days ?? 0),
      preco: formatCurrency(Number(recipe.sale_price ?? 0)),
      margem: formatPercent(Number(recipe.margin_percent ?? 0)),
    })),
  });

  return reports;
}

export function ProductionReports(props: Props) {
  const reports = buildReports(props);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {reports.map((report) => (
        <Card key={report.slug} className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{report.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1 text-xs text-muted-foreground">
              {report.kpis.map((kpi) => (
                <p key={kpi.label}>
                  {kpi.label}: <span className="font-medium text-foreground">{kpi.value}</span>
                </p>
              ))}
              <p>{report.rows.length} linhas</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => exportProductionPdf(report)}>
                <FileDown className="mr-2 size-4" /> PDF
              </Button>
              <Button size="sm" variant="secondary" onClick={() => exportProductionExcel(report)}>
                <FileSpreadsheet className="mr-2 size-4" /> Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
