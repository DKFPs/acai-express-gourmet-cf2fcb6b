import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import type { Ingredient, StockMovement } from "@/types/stock";

interface StockChartsProps {
  ingredients: Ingredient[];
  movements: StockMovement[];
}

export function StockCharts({ ingredients, movements }: StockChartsProps) {
  const stockData = useMemo(
    () =>
      [...ingredients]
        .sort((a, b) => Number(b.quantity) - Number(a.quantity))
        .slice(0, 8)
        .map((item) => ({
          name: item.name,
          atual: Number(item.quantity),
          minimo: Number(item.min_stock),
          critico: Number(item.quantity) <= Number(item.min_stock),
        })),
    [ingredients],
  );

  const flowData = useMemo(() => {
    const map = new Map<string, { dia: string; entradas: number; saidas: number }>();
    for (const movement of [...movements].reverse()) {
      const date = new Date(movement.created_at);
      const key = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      const entry = map.get(key) ?? { dia: key, entradas: 0, saidas: 0 };
      if (movement.type === "entrada") entry.entradas += Number(movement.quantity);
      if (movement.type === "saida") entry.saidas += Number(movement.quantity);
      map.set(key, entry);
    }
    return Array.from(map.values()).slice(-14);
  }, [movements]);

  const totalValue = useMemo(
    () =>
      ingredients.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.purchase_price),
        0,
      ),
    [ingredients],
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Estoque atual x mínimo</CardTitle>
          <CardDescription>
            Valor total em estoque: {formatCurrency(totalValue)}
          </CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stockData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="atual" radius={[6, 6, 0, 0]}>
                {stockData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.critico ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                  />
                ))}
              </Bar>
              <Bar dataKey="minimo" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Entradas e saídas</CardTitle>
          <CardDescription>Movimentações por dia</CardDescription>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={flowData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 12,
                }}
              />
              <Line type="monotone" dataKey="entradas" stroke="hsl(var(--primary))" strokeWidth={2} />
              <Line
                type="monotone"
                dataKey="saidas"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
