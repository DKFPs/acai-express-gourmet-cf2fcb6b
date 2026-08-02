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
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  categoryBreakdown,
  cashFlowSeries,
  dailySeries,
  monthlySeries,
} from "@/lib/finance-metrics";
import { formatCurrency } from "@/lib/format";
import type { FinancialEntry } from "@/types/finance";

const tooltipStyle = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  color: "hsl(var(--popover-foreground))",
} as const;

export function FinanceCharts({ entries }: { entries: FinancialEntry[] }) {
  const daily = dailySeries(entries);
  const monthly = monthlySeries(entries);
  const categories = categoryBreakdown(entries);
  const cashFlow = cashFlowSeries(entries);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Fluxo de caixa</CardTitle>
          <CardDescription>Saldo acumulado dos lançamentos pagos</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlow}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="dia" fontSize={12} />
              <YAxis fontSize={12} width={70} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
              <Area dataKey="saldo" name="Saldo" stroke="#D4AF37" fill="#D4AF37" fillOpacity={0.25} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Lucro diário</CardTitle>
          <CardDescription>Receitas x saídas por dia</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="dia" fontSize={12} />
              <YAxis fontSize={12} width={70} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="#22C55E" radius={[6, 6, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#EF4444" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Lucro mensal e margem</CardTitle>
          <CardDescription>Resultado consolidado por mês</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="mes" fontSize={12} />
              <YAxis fontSize={12} width={70} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line dataKey="lucro" name="Lucro (R$)" stroke="#6D28D9" strokeWidth={2} />
              <Line dataKey="margem" name="Margem (%)" stroke="#D4AF37" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Saídas por categoria</CardTitle>
          <CardDescription>Despesas, compras e investimentos</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => formatCurrency(value)} />
              <Pie data={categories} dataKey="valor" nameKey="nome" innerRadius={50} outerRadius={90}>
                {categories.map((slice) => (
                  <Cell key={slice.nome} fill={slice.cor} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
