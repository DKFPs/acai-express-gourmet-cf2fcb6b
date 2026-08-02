import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  DollarSign,
  Radio,
  Receipt,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { GoalsCard } from "@/components/dashboard/goals-card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import {
  useDashboardGoals,
  useDashboardOverview,
  useDashboardRealtime,
  useGoalsMutation,
} from "@/hooks/use-dashboard";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency, formatNumber } from "@/lib/format";
import { variation } from "@/services/dashboard.service";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel executivo — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Painel executivo com vendas do dia, semana e mês, lucro, ticket médio, metas, produtos mais vendidos e estoque baixo.",
      },
      { property: "og:title", content: "Painel executivo — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Indicadores em tempo real, metas e comparativo com o período anterior.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile } = useAuth();
  const { can } = usePermissions();
  const overview = useDashboardOverview();
  const goals = useDashboardGoals();
  const saveGoals = useGoalsMutation();
  useDashboardRealtime();

  const data = overview.data;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Olá, {profile?.full_name || "bem-vindo"} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Painel executivo com os números da operação, metas e comparativos.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 border-primary/40 text-primary">
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          Tempo real
        </Badge>
      </header>

      {overview.isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Vendas hoje"
              value={formatCurrency(data.hoje.vendas)}
              icon={DollarSign}
              change={variation(data.hoje.vendas, data.ontem.vendas)}
              changeLabel="vs ontem"
              delay={0}
            />
            <KpiCard
              label="Vendas semana"
              value={formatCurrency(data.semana.vendas)}
              icon={CalendarDays}
              change={variation(data.semana.vendas, data.semanaAnterior.vendas)}
              changeLabel="vs semana anterior"
              delay={40}
            />
            <KpiCard
              label="Vendas mês"
              value={formatCurrency(data.mes.vendas)}
              icon={CalendarRange}
              change={variation(data.mes.vendas, data.mesAnterior.vendas)}
              changeLabel="vs mês anterior"
              delay={80}
            />
            <KpiCard
              label="Lucro do mês"
              value={formatCurrency(data.lucroMes)}
              icon={TrendingUp}
              change={variation(data.lucroMes, data.lucroMesAnterior)}
              changeLabel="vs mês anterior"
              delay={120}
            />
            <KpiCard
              label="Ticket médio"
              value={formatCurrency(data.mes.ticket)}
              icon={Receipt}
              change={variation(data.mes.ticket, data.mesAnterior.ticket)}
              changeLabel="vs mês anterior"
              delay={160}
            />
            <KpiCard
              label="Pedidos no mês"
              value={formatNumber(data.mes.pedidos)}
              icon={ShoppingBag}
              change={variation(data.mes.pedidos, data.mesAnterior.pedidos)}
              changeLabel="vs mês anterior"
              delay={200}
            />
            <KpiCard
              label="Pedidos hoje"
              value={formatNumber(data.hoje.pedidos)}
              icon={ShoppingBag}
              change={variation(data.hoje.pedidos, data.ontem.pedidos)}
              changeLabel="vs ontem"
              delay={240}
            />
            <KpiCard
              label="Clientes novos"
              value={formatNumber(data.clientesNovos)}
              icon={UserPlus}
              hint="Cadastrados no mês"
              delay={280}
            />
            <KpiCard
              label="Clientes recorrentes"
              value={formatNumber(data.clientesRecorrentes)}
              icon={Users}
              hint="Com mais de um pedido"
              delay={320}
            />
            <KpiCard
              label="Estoque baixo"
              value={formatNumber(data.estoqueBaixo.length)}
              icon={AlertTriangle}
              hint="Ingredientes no mínimo"
              delay={360}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            {goals.data ? (
              <GoalsCard
                goals={goals.data}
                today={data.hoje.vendas}
                week={data.semana.vendas}
                month={data.mes.vendas}
                canManage={can("dashboard.goals")}
                onSave={(values) =>
                  saveGoals.mutate({ goals: values, id: goals.data?.id ?? null })
                }
              />
            ) : (
              <Skeleton className="h-64 w-full rounded-2xl" />
            )}

            <Card className="animate-fade-in rounded-2xl border-border/60 bg-card/70 shadow-soft backdrop-blur">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Estoque baixo
                </CardTitle>
                <CardDescription>Ingredientes no limite mínimo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.estoqueBaixo.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nenhum ingrediente crítico. 🎉
                  </p>
                ) : (
                  data.estoqueBaixo.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground">
                        {formatNumber(item.quantity)} {item.unit} · mín {formatNumber(item.min_stock)}
                      </span>
                    </div>
                  ))
                )}
                <Link
                  to="/estoque"
                  className="inline-block pt-1 underline-offset-4 hover:underline text-xs font-medium text-primary"
                >
                  Ir para o estoque
                </Link>
              </CardContent>
            </Card>
          </div>

          <DashboardCharts data={data} />

          <Card className="animate-fade-in rounded-2xl border-border/60 bg-card/70 shadow-soft backdrop-blur">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-gold" />
                Produtos mais vendidos
              </CardTitle>
              <CardDescription>Ranking do mês atual por quantidade</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {data.topProdutos.length === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">Nenhuma venda registrada no mês.</p>
              ) : (
                data.topProdutos.map((product, index) => (
                  <div
                    key={product.name}
                    className="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                        {index + 1}
                      </span>
                      {product.name}
                    </span>
                    <span className="text-muted-foreground">
                      {formatNumber(product.quantidade)} un · {formatCurrency(product.total)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
