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
import { formatCurrency } from "@/lib/format";
import type { DashboardData } from "@/services/dashboard.service";

const COLORS = [
  "var(--color-chart-1, var(--primary))",
  "var(--color-gold, var(--accent))",
  "var(--color-chart-3, var(--secondary))",
  "var(--color-muted-foreground)",
  "var(--destructive)",
];

const axis = { stroke: "var(--muted-foreground)", fontSize: 11 };

function ChartCard({
  title,
  description,
  children,
  delay = 0,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Card
      className="animate-fade-in rounded-2xl border-border/60 bg-card/70 shadow-soft backdrop-blur"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DashboardCharts({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Vendas dos últimos 14 dias" description="Faturamento diário" delay={0}>
        <AreaChart data={data.serie}>
          <defs>
            <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.6} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={axis} />
          <YAxis tick={axis} width={70} tickFormatter={(value) => formatCurrency(value)} />
          <Tooltip formatter={(value: number) => formatCurrency(value)} />
          <Area
            type="monotone"
            dataKey="vendas"
            name="Vendas"
            stroke="var(--primary)"
            fill="url(#salesFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ChartCard>

      <ChartCard title="Pedidos por dia" description="Volume de pedidos" delay={80}>
        <LineChart data={data.serie}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={axis} />
          <YAxis tick={axis} width={40} allowDecimals={false} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="pedidos"
            name="Pedidos"
            stroke="var(--gold, var(--accent))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartCard>

      <ChartCard title="Produtos mais vendidos" description="Quantidade vendida no mês" delay={160}>
        <BarChart data={data.topProdutos} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis type="number" tick={axis} allowDecimals={false} />
          <YAxis type="category" dataKey="name" tick={axis} width={120} />
          <Tooltip />
          <Bar dataKey="quantidade" name="Quantidade" fill="var(--primary)" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ChartCard>

      <ChartCard title="Pedidos por situação" description="Distribuição do mês atual" delay={240}>
        <PieChart>
          <Pie
            data={data.statusMes}
            dataKey="total"
            nameKey="status"
            innerRadius={55}
            outerRadius={90}
            paddingAngle={3}
          >
            {data.statusMes.map((entry, index) => (
              <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>
      </ChartCard>
    </div>
  );
}
