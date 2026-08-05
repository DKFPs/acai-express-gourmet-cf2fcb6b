import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Grade de indicadores (KPIs). */
export function KpiGridSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-5", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-28 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/** Linhas de tabela. */
export function TableSkeleton({ rows = 6, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2 rounded-2xl border border-border/60 bg-card/60 p-4", className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-32 sm:block" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Lista de cards (mobile e grades). */
export function CardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}

/** Área de gráfico. */
export function ChartSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-72 w-full rounded-2xl", className)} />;
}

/** Carregamento inline centralizado. */
export function InlineLoader({ label = "Carregando…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}
