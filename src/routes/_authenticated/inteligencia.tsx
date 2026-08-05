import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Brain,
  Clock,
  CalendarDays,
  Crown,
  Flame,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Droplets,
} from "lucide-react";

import { InsightCard } from "@/components/intelligence/insight-card";
import { IntelligenceCharts } from "@/components/intelligence/intelligence-charts";
import { SuggestionsPanel } from "@/components/intelligence/suggestions-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntelligence, useIntelligenceRealtime } from "@/hooks/use-intelligence";
import { buildSuggestions } from "@/lib/intelligence-rules";
import { formatCurrency, formatNumber } from "@/lib/format";
import { PageHeader } from "@/components/common/page-header";

export const Route = createFileRoute("/_authenticated/inteligencia")({
  component: IntelligencePage,
  head: () => ({
    meta: [
      { title: "Inteligência — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Análise automática das vendas: sabor mais vendido e mais lucrativo, melhores horários, margens, custos e sugestões inteligentes.",
      },
      { property: "og:title", content: "Inteligência — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Insights automáticos de vendas, margens, custos e estoque da sua açaiteria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const PERIODS = [
  { label: "7 dias", value: 7 },
  { label: "30 dias", value: 30 },
  { label: "90 dias", value: 90 },
];

function IntelligencePage() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useIntelligence(days);
  useIntelligenceRealtime();

  const suggestions = useMemo(() => (data ? buildSuggestions(data) : []), [data]);

  const maisVendido = data?.sabores[0];
  const maisLucrativo = useMemo(
    () => (data ? [...data.sabores].sort((a, b) => b.lucro - a.lucro)[0] : undefined),
    [data],
  );
  const melhorHora = useMemo(
    () => (data ? [...data.horas].sort((a, b) => b.faturamento - a.faturamento)[0] : undefined),
    [data],
  );
  const piorHora = useMemo(
    () => (data ? [...data.horas].sort((a, b) => a.faturamento - b.faturamento)[0] : undefined),
    [data],
  );
  const melhorDia = useMemo(
    () => (data ? [...data.semana].sort((a, b) => b.faturamento - a.faturamento)[0] : undefined),
    [data],
  );
  const topCliente = data?.clientes[0];
  const maiorMargem = data?.margens[0];
  const menorMargem = data?.margens.at(-1);
  const topIngrediente = data?.ingredientes[0];

  const variacaoLucro =
    data && data.lucroAnterior > 0
      ? ((data.lucro - data.lucroAnterior) / data.lucroAnterior) * 100
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Brain}
        title="Inteligência"
        description="Análise automática das suas vendas, custos e estoque — atualizada em tempo real."
        actions={
          <>
            {PERIODS.map((period) => (
              <Button
                key={period.value}
                size="sm"
                variant={days === period.value ? "default" : "outline"}
                onClick={() => setDays(period.value)}
              >
                {period.label}
              </Button>
            ))}
          </>
        }
      />

      {isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <Card className="rounded-2xl border-border/60 bg-card/70 shadow-soft backdrop-blur">
            <CardContent className="flex flex-wrap items-center gap-4 p-4 text-sm">
              <Badge variant="secondary">Últimos {data.dias} dias</Badge>
              <span className="text-muted-foreground">
                Faturamento{" "}
                <strong className="text-foreground">{formatCurrency(data.faturamento)}</strong>
              </span>
              <span className="text-muted-foreground">
                Lucro estimado{" "}
                <strong className="text-foreground">{formatCurrency(data.lucro)}</strong>
              </span>
              <span className="text-muted-foreground">
                Pedidos <strong className="text-foreground">{formatNumber(data.pedidos)}</strong>
              </span>
              {variacaoLucro !== null ? (
                <span className={variacaoLucro >= 0 ? "text-emerald-500" : "text-destructive"}>
                  {variacaoLucro >= 0 ? "+" : ""}
                  {variacaoLucro.toFixed(1)}% de lucro vs. período anterior
                </span>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InsightCard
              label="Sabor mais vendido"
              value={maisVendido?.name ?? "—"}
              hint={
                maisVendido
                  ? `${formatNumber(maisVendido.quantidade)} unidades`
                  : "Sem vendas no período"
              }
              icon={Flame}
              delay={0}
            />
            <InsightCard
              label="Sabor mais lucrativo"
              value={maisLucrativo?.name ?? "—"}
              hint={maisLucrativo ? `${formatCurrency(maisLucrativo.lucro)} de lucro` : undefined}
              icon={PiggyBank}
              tone="positive"
              delay={40}
            />
            <InsightCard
              label="Melhor horário"
              value={melhorHora?.hora ?? "—"}
              hint={melhorHora ? formatCurrency(melhorHora.faturamento) : undefined}
              icon={Clock}
              tone="positive"
              delay={80}
            />
            <InsightCard
              label="Pior horário"
              value={piorHora?.hora ?? "—"}
              hint={piorHora ? formatCurrency(piorHora.faturamento) : undefined}
              icon={Clock}
              tone="negative"
              delay={120}
            />
            <InsightCard
              label="Melhor dia da semana"
              value={melhorDia?.dia ?? "—"}
              hint={melhorDia ? formatCurrency(melhorDia.faturamento) : undefined}
              icon={CalendarDays}
              delay={160}
            />
            <InsightCard
              label="Cliente que mais comprou"
              value={topCliente?.name ?? "—"}
              hint={
                topCliente
                  ? `${formatCurrency(topCliente.total)} · ${topCliente.pedidos} pedidos`
                  : undefined
              }
              icon={Crown}
              delay={200}
            />
            <InsightCard
              label="Maior margem"
              value={maiorMargem?.name ?? "—"}
              hint={maiorMargem ? `${maiorMargem.margem.toFixed(1)}% de margem` : undefined}
              icon={TrendingUp}
              tone="positive"
              delay={240}
            />
            <InsightCard
              label="Menor margem"
              value={menorMargem?.name ?? "—"}
              hint={menorMargem ? `${menorMargem.margem.toFixed(1)}% de margem` : undefined}
              icon={TrendingDown}
              tone="negative"
              delay={280}
            />
            <InsightCard
              label="Ingrediente que mais custa"
              value={topIngrediente?.name ?? "—"}
              hint={
                topIngrediente ? `${formatCurrency(topIngrediente.custo)} no período` : undefined
              }
              icon={Droplets}
              tone="negative"
              delay={320}
            />
          </div>

          <SuggestionsPanel suggestions={suggestions} />

          <IntelligenceCharts data={data} />
        </>
      )}
    </div>
  );
}
