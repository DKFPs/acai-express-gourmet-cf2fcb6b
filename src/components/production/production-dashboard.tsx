import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { ProductionOverview } from "@/types/production-advanced";

const CHART_COLORS = ["#6D28D9", "#D4AF37", "#9F7AEA", "#38BDF8", "#F97316"];

function shortDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

export function ProductionDashboard({ data }: { data: ProductionOverview | undefined }) {
  const series = useMemo(
    () => (data?.series ?? []).map((point) => ({ ...point, label: shortDate(point.date) })),
    [data],
  );

  if (!data) {
    return <p className="py-10 text-center text-muted-foreground">Carregando indicadores…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Produção hoje" value={`${formatNumber(data.today)} un`} />
        <Kpi label="Produção da semana" value={`${formatNumber(data.week)} un`} />
        <Kpi
          label="Produção do mês"
          value={`${formatNumber(data.month)} un`}
          hint={`Custo ${formatCurrency(data.costMonth)}`}
        />
        <Kpi label="Disponível em estoque" value={`${formatNumber(data.available)} un`} />
        <Kpi label="Lucro do dia" value={formatCurrency(data.profitDay)} />
        <Kpi label="Lucro do mês" value={formatCurrency(data.profitMonth)} />
        <Kpi
          label="Perdas"
          value={`${formatNumber(data.losses)} un`}
          hint={formatCurrency(data.lossValue)}
        />
        <Kpi label="Desperdício" value={formatPercent(data.wastePercent)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Produção por dia</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="prodFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6D28D9" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#6D28D9" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="quantity"
                  name="Unidades"
                  stroke="#6D28D9"
                  fill="url(#prodFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Custo de produção</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  name="Custo"
                  stroke="#D4AF37"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas mais produzidas</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.topRecipes}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-15}
                  height={50}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="quantity" name="Unidades" radius={[8, 8, 0, 0]}>
                  {data.topRecipes.map((entry, index) => (
                    <Cell key={entry.recipe_id} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lucratividade por receita</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...data.mostProfitable].reverse()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="profit" name="Lucro" fill="#6D28D9" radius={[0, 8, 8, 0]} />
                <Bar dataKey="cost" name="Custo" fill="#D4AF37" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Receitas menos lucrativas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {data.leastProfitable.map((recipe) => (
            <div key={recipe.recipe_id} className="rounded-xl border border-border/60 p-3">
              <p className="text-sm font-medium">{recipe.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(recipe.quantity)} un · margem {formatPercent(recipe.margin)}
              </p>
              <p
                className={
                  recipe.profit < 0
                    ? "text-sm font-semibold text-destructive"
                    : "text-sm font-semibold"
                }
              >
                {formatCurrency(recipe.profit)}
              </p>
            </div>
          ))}
          {data.leastProfitable.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem produção no período.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
