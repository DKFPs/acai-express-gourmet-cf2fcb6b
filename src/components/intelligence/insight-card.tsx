import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface InsightCardProps {
  label: string;
  value: string;
  hint?: string | undefined;
  icon: LucideIcon;
  tone?: "default" | "positive" | "negative";
  delay?: number;
}

export function InsightCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  delay = 0,
}: InsightCardProps) {
  const accent =
    tone === "positive"
      ? "bg-emerald-500/10 text-emerald-500"
      : tone === "negative"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";

  return (
    <Card
      className="animate-fade-in rounded-2xl border-border/60 bg-card/70 shadow-soft backdrop-blur transition-transform duration-200 hover:-translate-y-0.5"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    >
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${accent}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="truncate text-xl font-bold tracking-tight" title={value}>
          {value}
        </p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
