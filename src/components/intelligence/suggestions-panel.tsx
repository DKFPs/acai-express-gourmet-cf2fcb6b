import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Info, Sparkles, TrendingUp } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Suggestion, SuggestionTone } from "@/types/intelligence";

const TONE: Record<SuggestionTone, { icon: typeof Info; className: string }> = {
  critical: {
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  warning: { icon: TrendingUp, className: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
  info: { icon: Info, className: "bg-primary/10 text-primary border-primary/30" },
  positive: {
    icon: Sparkles,
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  },
};

export function SuggestionsPanel({ suggestions }: { suggestions: Suggestion[] }) {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/70 shadow-soft backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Sugestões automáticas
        </CardTitle>
        <CardDescription>
          Recomendações geradas a partir das suas vendas, custos e estoque.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestions.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sem alertas no momento. Continue registrando vendas para gerar novas sugestões.
          </p>
        ) : (
          suggestions.map((suggestion) => {
            const tone = TONE[suggestion.tone];
            const Icon = tone.icon;
            const content = (
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3 transition-colors hover:bg-muted/40">
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${tone.className}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                </div>
                {suggestion.to ? (
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : null}
              </div>
            );

            return suggestion.to ? (
              <Link key={suggestion.id} to={suggestion.to} className="block">
                {content}
              </Link>
            ) : (
              <div key={suggestion.id}>{content}</div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
