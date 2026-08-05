import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

/** Estado vazio padrão: ícone, texto e ação principal opcional. */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex animate-fade-in flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 text-center",
        compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-12",
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
