import { AlertTriangle, ArrowLeftRight, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isCritical } from "@/components/stock/ingredient-table";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Ingredient } from "@/types/stock";

interface IngredientCardsProps {
  items: Ingredient[];
  canManage: boolean;
  onEdit: (item: Ingredient) => void;
  onDelete: (item: Ingredient) => void;
  onMove: (item: Ingredient) => void;
}

export function IngredientCards({
  items,
  canManage,
  onEdit,
  onDelete,
  onMove,
}: IngredientCardsProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
        Nenhum ingrediente encontrado.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <Card key={item.id} className="rounded-2xl">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.category?.name ?? "Sem categoria"} · {item.supplier?.name ?? "sem fornecedor"}
                </p>
              </div>
              {isCritical(item) ? (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="size-3" /> crítico
                </Badge>
              ) : null}
            </div>

            <div className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Estoque</p>
                <p className="font-medium">
                  {formatNumber(item.quantity)} {item.unit}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mínimo</p>
                <p>
                  {formatNumber(item.min_stock)} {item.unit}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Compra</p>
                <p>{formatCurrency(item.purchase_price)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => onMove(item)}>
                <ArrowLeftRight className="mr-2 size-4" /> Movimentar
              </Button>
              {canManage ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => onEdit(item)}>
                    <Pencil className="mr-2 size-4" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => onDelete(item)}
                  >
                    <Trash2 className="mr-2 size-4" /> Excluir
                  </Button>
                </>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
