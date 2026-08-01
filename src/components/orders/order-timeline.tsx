import { CheckCircle2, Circle } from "lucide-react";

import { cn } from "@/lib/utils";
import { ORDER_STATUS_LABELS, type OrderHistoryRow, type OrderStatus } from "@/types/order";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function OrderTimeline({
  history,
  currentStatus,
}: {
  history: OrderHistoryRow[];
  currentStatus: OrderStatus;
}) {
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem histórico registrado.</p>;
  }

  return (
    <ol className="relative space-y-5 pl-6">
      <span className="absolute left-[7px] top-2 bottom-2 w-px bg-border/70" aria-hidden />
      {history.map((entry) => {
        const status = entry.status as OrderStatus;
        const isCurrent = status === currentStatus;
        return (
          <li key={entry.id} className="relative animate-fade-in">
            <span className="absolute -left-6 top-0.5 text-primary">
              {isCurrent ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
            </span>
            <p className={cn("text-sm font-medium", isCurrent && "text-primary")}>
              {ORDER_STATUS_LABELS[status]}
            </p>
            <p className="text-xs text-muted-foreground">
              {dateTime.format(new Date(entry.created_at))}
              {entry.note ? ` — ${entry.note}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
