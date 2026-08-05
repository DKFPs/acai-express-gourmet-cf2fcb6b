import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  change?: number;
  changeLabel?: string;
  delay?: number;
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  change,
  changeLabel,
  delay = 0,
}: KpiCardProps) {
  const positive = (change ?? 0) > 0;
  const negative = (change ?? 0) < 0;
  const ChangeIcon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;

  return (
    <Card
      className="animate-fade-in rounded-2xl border-border/60 bg-card/70 shadow-soft backdrop-blur transition-transform duration-200 hover:-translate-y-0.5"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <div className="flex items-center gap-2 text-xs">
          {change === undefined ? (
            <span className="text-muted-foreground">{hint}</span>
          ) : (
            <>
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${
                  positive
                    ? "bg-primary/10 text-primary"
                    : negative
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                <ChangeIcon className="h-3 w-3" />
                {Math.abs(change).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%
              </span>
              <span className="text-muted-foreground">{changeLabel}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
