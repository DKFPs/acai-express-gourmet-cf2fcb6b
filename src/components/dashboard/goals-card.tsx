import { useState } from "react";
import { Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { parseNumber } from "@/lib/validations/stock";
import type { DashboardGoals } from "@/services/dashboard.service";

interface GoalsCardProps {
  goals: DashboardGoals;
  today: number;
  week: number;
  month: number;
  canManage: boolean;
  onSave: (goals: Omit<DashboardGoals, "id">) => void;
}

function GoalRow({ label, value, goal }: { label: string; value: number; goal: number }) {
  const percent = goal > 0 ? Math.min(Math.round((value / goal) * 100), 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {formatCurrency(value)} / {goal > 0 ? formatCurrency(goal) : "—"}
        </span>
      </div>
      <Progress value={percent} className="h-2" />
      <p className="text-xs text-muted-foreground">{percent}% da meta atingida</p>
    </div>
  );
}

export function GoalsCard({ goals, today, week, month, canManage, onSave }: GoalsCardProps) {
  const [open, setOpen] = useState(false);
  const [daily, setDaily] = useState(String(goals.daily_goal));
  const [weekly, setWeekly] = useState(String(goals.weekly_goal));
  const [monthly, setMonthly] = useState(String(goals.monthly_goal));

  const submit = () => {
    onSave({
      daily_goal: parseNumber(daily) || 0,
      weekly_goal: parseNumber(weekly) || 0,
      monthly_goal: parseNumber(monthly) || 0,
    });
    setOpen(false);
  };

  return (
    <Card className="animate-fade-in rounded-2xl border-border/60 bg-card/70 shadow-soft backdrop-blur">
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-gold" />
            Metas de faturamento
          </CardTitle>
          <CardDescription>Acompanhe o progresso diário, semanal e mensal</CardDescription>
        </div>
        {canManage ? (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Editar
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <GoalRow label="Meta diária" value={today} goal={goals.daily_goal} />
        <GoalRow label="Meta semanal" value={week} goal={goals.weekly_goal} />
        <GoalRow label="Meta mensal" value={month} goal={goals.monthly_goal} />
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Definir metas</DialogTitle>
            <DialogDescription>Valores de faturamento esperados por período.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="goal-daily">Meta diária (R$)</Label>
              <Input id="goal-daily" inputMode="decimal" value={daily} onChange={(event) => setDaily(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-weekly">Meta semanal (R$)</Label>
              <Input id="goal-weekly" inputMode="decimal" value={weekly} onChange={(event) => setWeekly(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-monthly">Meta mensal (R$)</Label>
              <Input id="goal-monthly" inputMode="decimal" value={monthly} onChange={(event) => setMonthly(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
