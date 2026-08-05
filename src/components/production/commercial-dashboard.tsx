import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import type { CommercialOverview } from "@/types/production-advanced";

const COLORS = ["#6D28D9", "#D4AF37", "#9F7AEA", "#38BDF8", "#F97316", "#22C55E"];

const tooltipStyle = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 12,
  color: "hsl(var(--popover-foreground))",
  fontSize: 12,
};

export function CommercialDashboard({ data }: { data: CommercialOverview | undefined }) {
  if (!data) {
    return <p className="py-10 text-center text-muted-foreground">Carregando indicadores…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Quantidade vendida</p>
            <p className="text-2xl font-semibold">{formatNumber(data.totalQuantity)} un</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Receita</p>
            <p className="text-2xl font-semibold">{formatCurrency(data.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Lucro</p>
            <p className="text-2xl font-semibold">{formatCurrency(data.totalProfit)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sabores mais vendidos</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.bestSellers}>
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
                  {data.bestSellers.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita por sabor</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.bestSellers}
                  dataKey="revenue"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {data.bestSellers.map((entry, index) => (
                    <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => formatCurrency(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ranking de sabores</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Sabor</TableHead>
                <TableHead>Vendidos</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Lucro</TableHead>
                <TableHead className="text-right">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.flavors.map((flavor, index) => (
                <TableRow key={flavor.name}>
                  <TableCell>
                    <Badge variant={index < 3 ? "default" : "outline"}>{index + 1}º</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{flavor.name}</TableCell>
                  <TableCell>{formatNumber(flavor.quantity)}</TableCell>
                  <TableCell>{formatCurrency(flavor.revenue)}</TableCell>
                  <TableCell className={flavor.profit < 0 ? "text-destructive" : undefined}>
                    {formatCurrency(flavor.profit)}
                  </TableCell>
                  <TableCell className="text-right">{formatPercent(flavor.margin)}</TableCell>
                </TableRow>
              ))}
              {data.flavors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhuma venda registrada no período.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
