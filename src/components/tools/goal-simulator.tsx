import { useMemo, useState } from "react";
import { Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { simulateGoal } from "@/lib/tools-goals";
import type { CommercialOverview } from "@/types/production-advanced";

export function GoalSimulator({
  overview,
  isLoading,
}: {
  overview: CommercialOverview | undefined;
  isLoading: boolean;
}) {
  const [goal, setGoal] = useState(10000);
  const [days, setDays] = useState(30);

  const plan = useMemo(() => simulateGoal(overview, goal, days), [overview, goal, days]);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" />
            Simulador de metas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Meta de faturamento (R$)</Label>
            <Input
              type="number"
              min={0}
              step="100"
              value={goal}
              onChange={(event) => setGoal(Number(event.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Prazo (dias)</Label>
            <Input
              type="number"
              min={1}
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            />
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
            Base: últimos 30 dias de vendas. Ticket médio {formatCurrency(plan.averageTicket)} ·
            lucro médio {formatCurrency(plan.profitPerUnit)} por garrafinha · margem{" "}
            {formatPercent(plan.marginPercent)}.
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plano para bater a meta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Carregando histórico…</p>
          ) : !plan.hasHistory ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Ainda não há vendas suficientes no histórico para projetar a meta.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Garrafinhas necessárias" value={formatNumber(plan.bottles)} />
                <Metric label="Por dia" value={formatNumber(plan.bottlesPerDay)} />
                <Metric label="Lucro estimado" value={formatCurrency(plan.expectedProfit)} />
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sabor</TableHead>
                      <TableHead>Participação</TableHead>
                      <TableHead>Garrafinhas</TableHead>
                      <TableHead>Faturamento</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plan.flavors.map((flavor) => (
                      <TableRow key={flavor.name}>
                        <TableCell className="font-medium">{flavor.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{formatPercent(flavor.share)}</Badge>
                        </TableCell>
                        <TableCell>{formatNumber(flavor.bottles)}</TableCell>
                        <TableCell>{formatCurrency(flavor.revenue)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(flavor.profit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
