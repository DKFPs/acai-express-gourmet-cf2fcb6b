import { CheckCircle2, Pencil, Receipt, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { StatusBadge, formatDay } from "@/components/finance/entry-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { TYPE_LABEL, type FinancialEntry } from "@/types/finance";

interface EntryCardsProps {
  items: FinancialEntry[];
  canManage: boolean;
  onEdit: (entry: FinancialEntry) => void;
  onDelete: (entry: FinancialEntry) => void;
  onSettle: (entry: FinancialEntry) => void;
}

export function EntryCards({ items, canManage, onEdit, onDelete, onSettle }: EntryCardsProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Nenhum lançamento encontrado"
        description="Altere o período ou registre um novo lançamento."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((entry) => (
        <Card key={entry.id} className="rounded-2xl">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{entry.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDay(entry.due_date)} · {entry.category?.name ?? "Sem categoria"}
                </p>
              </div>
              <p
                className={`whitespace-nowrap font-semibold ${
                  entry.type === "receita" ? "text-emerald-500" : "text-destructive"
                }`}
              >
                {entry.type === "receita" ? "+" : "−"} {formatCurrency(entry.amount)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{TYPE_LABEL[entry.type]}</Badge>
              <StatusBadge entry={entry} />
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                {entry.status === "pendente" ? (
                  <Button size="sm" variant="secondary" onClick={() => onSettle(entry)}>
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Pagar
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => onEdit(entry)}>
                  <Pencil className="mr-1 h-4 w-4" /> Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(entry)}>
                  <Trash2 className="mr-1 h-4 w-4 text-destructive" /> Excluir
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
