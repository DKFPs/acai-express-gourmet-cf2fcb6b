import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { IntelligenceData } from "@/types/intelligence";

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

export function IntelligenceCharts({ data }: { data: IntelligenceData }) {
  const melhorHora = [...data.horas].sort((a, b) => b.faturamento - a.faturamento)[0]?.hora;
  const piorHora = [...data.horas].sort((a, b) => a.faturamento - b.faturamento)[0]?.hora;
  const lucroSabores = [...data.sabores].sort((a, b) => b.lucro - a.lucro).slice(0, 6);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Vendas por horário" description="Faturamento por hora do dia" delay={0}>
        <BarChart data={data.horas}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="hora" {...axis} />
          <YAxis {...axis} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
          <Bar dataKey="faturamento" name="Faturamento" radius={[6, 6, 0, 0]}>
            {data.horas.map((hour) => (
              <Cell
                key={hour.hora}
                fill={
                  hour.hora === melhorHora
                    ? "var(--color-gold, var(--accent))"
                    : hour.hora === piorHora
                      ? "var(--destructive)"
                      : "var(--primary)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartCard>

      <ChartCard
        title="Faturamento por dia da semana"
        description="Soma do período analisado"
        delay={60}
      >
        <BarChart data={data.semana}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="dia" {...axis} tickFormatter={(value: string) => value.slice(0, 3)} />
          <YAxis {...axis} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
          <Bar
            dataKey="faturamento"
            name="Faturamento"
            fill="var(--primary)"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ChartCard>

      <ChartCard title="Sabores mais lucrativos" description="Lucro estimado por sabor" delay={120}>
        <BarChart data={lucroSabores} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" {...axis} />
          <YAxis type="category" dataKey="name" width={110} {...axis} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
          <Bar
            dataKey="lucro"
            name="Lucro"
            fill="var(--color-gold, var(--accent))"
            radius={[0, 6, 6, 0]}
          />
        </BarChart>
      </ChartCard>

      <ChartCard
        title="Receita x Custo x Lucro"
        description="Evolução diária no período"
        delay={180}
      >
        <AreaChart data={data.tendencia}>
          <defs>
            <linearGradient id="intelRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.6} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" {...axis} />
          <YAxis {...axis} />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="receita"
            name="Receita"
            stroke="var(--primary)"
            fill="url(#intelRevenue)"
          />
          <Area
            type="monotone"
            dataKey="custo"
            name="Custo"
            stroke="var(--destructive)"
            fill="transparent"
          />
          <Area
            type="monotone"
            dataKey="lucro"
            name="Lucro"
            stroke="var(--color-gold, var(--accent))"
            fill="transparent"
          />
        </AreaChart>
      </ChartCard>

      <ChartCard
        title="Custo por ingrediente"
        description="Participação no custo do período"
        delay={240}
      >
        <PieChart>
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
          <Legend />
          <Pie
            data={data.ingredientes}
            dataKey="custo"
            nameKey="name"
            innerRadius={45}
            outerRadius={85}
          >
            {data.ingredientes.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartCard>

      <ChartCard title="Margem por produto" description="Maiores e menores margens (%)" delay={300}>
        <BarChart data={[...data.margens.slice(0, 3), ...data.margens.slice(-3)]}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" {...axis} tickFormatter={(value: string) => value.slice(0, 10)} />
          <YAxis {...axis} />
          <Tooltip
            formatter={(value: number) => `${value.toFixed(1)}%`}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          />
          <Bar dataKey="margem" name="Margem" radius={[6, 6, 0, 0]}>
            {[...data.margens.slice(0, 3), ...data.margens.slice(-3)].map((entry) => (
              <Cell
                key={entry.name}
                fill={
                  entry.margem >= 30
                    ? "var(--primary)"
                    : entry.margem >= 15
                      ? "var(--color-gold, var(--accent))"
                      : "var(--destructive)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ChartCard>
    </div>
  );
}
