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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { ReportChart } from "@/types/report";

const axisProps = {
  stroke: "hsl(var(--muted-foreground))",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

function tooltipStyle() {
  return {
    contentStyle: {
      background: "hsl(var(--popover))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 12,
      fontSize: 12,
      color: "hsl(var(--popover-foreground))",
    },
  };
}

function ChartBody({ chart }: { chart: ReportChart }) {
  if (!chart.data.length) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Sem dados no período.</p>;
  }

  if (chart.type === "pie") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={chart.data}
            dataKey="valor"
            nameKey={chart.xKey}
            innerRadius={55}
            outerRadius={95}
            paddingAngle={2}
          >
            {chart.data.map((slice, index) => (
              <Cell key={index} fill={String(slice["fill"] ?? chart.series[0]?.color)} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle()} formatter={(value: number) => formatCurrency(value)} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chart.type === "area") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chart.data}>
          <defs>
            {chart.series.map((serie) => (
              <linearGradient
                key={serie.key}
                id={`grad-${chart.id}-${serie.key}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={serie.color} stopOpacity={0.5} />
                <stop offset="95%" stopColor={serie.color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={chart.xKey} {...axisProps} />
          <YAxis {...axisProps} width={70} />
          <Tooltip {...tooltipStyle()} />
          {chart.series.map((serie) => (
            <Area
              key={serie.key}
              type="monotone"
              dataKey={serie.key}
              name={serie.label}
              stroke={serie.color}
              fill={`url(#grad-${chart.id}-${serie.key})`}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chart.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chart.data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey={chart.xKey} {...axisProps} />
          <YAxis {...axisProps} width={60} />
          <Tooltip {...tooltipStyle()} />
          {chart.series.map((serie) => (
            <Line
              key={serie.key}
              type="monotone"
              dataKey={serie.key}
              name={serie.label}
              stroke={serie.color}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chart.data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey={chart.xKey}
          {...axisProps}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={60}
        />
        <YAxis {...axisProps} width={70} />
        <Tooltip {...tooltipStyle()} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {chart.series.map((serie) => (
          <Bar
            key={serie.key}
            dataKey={serie.key}
            name={serie.label}
            fill={serie.color}
            radius={[6, 6, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReportCharts({ charts }: { charts: ReportChart[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {charts.map((chart) => (
        <Card key={chart.id} className="animate-fade-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{chart.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartBody chart={chart} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
