import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, FileSpreadsheet, FileText, Printer } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { ReportCharts } from "@/components/reports/report-charts";
import { ReportTable } from "@/components/reports/report-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useReport } from "@/hooks/use-reports";
import { exportReportExcel, exportReportPdf, printReport } from "@/lib/report-export";
import { formatValue } from "@/lib/report-format";
import {
  REPORT_KINDS,
  periodLabel,
  presetPeriod,
  type ReportKind,
  type ReportPeriod,
} from "@/types/report";

const PRESETS = [
  { value: "hoje", label: "Hoje" },
  { value: "7", label: "Últimos 7 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "mes", label: "Mês atual" },
  { value: "ano", label: "Ano atual" },
  { value: "custom", label: "Personalizado" },
];

export const Route = createFileRoute("/_authenticated/relatorios")({
  component: RelatoriosPage,
  head: () => ({
    meta: [
      { title: "Relatórios — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Gere relatórios de vendas, financeiro, lucro, clientes, produtos, estoque e fluxo de caixa com gráficos e exportação em PDF e Excel.",
      },
      { property: "og:title", content: "Relatórios — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Relatórios por período com gráficos, impressão e exportação PDF/Excel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function RelatoriosPage() {
  const [kind, setKind] = useState<ReportKind>("vendas");
  const [preset, setPreset] = useState("30");
  const [period, setPeriod] = useState<ReportPeriod>(() => presetPeriod("30"));

  const { data, isLoading, isFetching } = useReport(kind, period);

  const kindMeta = useMemo(() => REPORT_KINDS.find((item) => item.value === kind), [kind]);

  const applyPreset = (value: string) => {
    setPreset(value);
    if (value !== "custom") setPeriod(presetPeriod(value));
  };

  const setBoundary = (field: "from" | "to", value: string) => {
    setPreset("custom");
    setPeriod((current) => ({ ...current, [field]: value }));
  };

  const disabled = !data || !data.rows.length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BarChart3}
        title="Relatórios"
        description={`${kindMeta?.description ?? ""} · ${periodLabel(period)}`}
      />

      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1.5">
            <Label>Relatório</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as ReportKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_KINDS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Período</Label>
            <Select value={preset} onValueChange={applyPreset}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="from">De</Label>
            <Input
              id="from"
              type="date"
              value={period.from}
              onChange={(event) => setBoundary("from", event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="to">Até</Label>
            <Input
              id="to"
              type="date"
              value={period.to}
              onChange={(event) => setBoundary("to", event.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => data && exportReportPdf(data, period)}
            >
              <FileText className="mr-2 size-4" /> PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => data && exportReportExcel(data, period)}
            >
              <FileSpreadsheet className="mr-2 size-4" /> Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => data && printReport(data, period)}
            >
              <Printer className="mr-2 size-4" /> Imprimir
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading || !data ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : (
        <div className={isFetching ? "space-y-6 opacity-70 transition-opacity" : "space-y-6"}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {data.kpis.map((kpi) => (
              <Card key={kpi.label} className="animate-fade-up">
                <CardContent className="pt-6">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {formatValue(kpi.value, kpi.format)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <ReportCharts charts={data.charts} />

          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">
              Detalhamento ({data.rows.length} registros
              {data.rows.length > 300 ? " — exibindo os 300 primeiros" : ""})
            </h2>
            <ReportTable result={data} />
          </div>
        </div>
      )}
    </div>
  );
}
