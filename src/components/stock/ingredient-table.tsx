import { MoreHorizontal, Pencil, Trash2, ArrowLeftRight, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";
import type { Ingredient } from "@/types/stock";

export function isCritical(item: Ingredient) {
  return Number(item.quantity) <= Number(item.min_stock);
}

interface IngredientTableProps {
  items: Ingredient[];
  canManage: boolean;
  onEdit: (item: Ingredient) => void;
  onDelete: (item: Ingredient) => void;
  onMove: (item: Ingredient) => void;
}

export function IngredientTable({
  items,
  canManage,
  onEdit,
  onDelete,
  onMove,
}: IngredientTableProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        Nenhum ingrediente encontrado.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ingrediente</TableHead>
            <TableHead>Fornecedor</TableHead>
            <TableHead className="text-right">Estoque</TableHead>
            <TableHead className="text-right">Mínimo</TableHead>
            <TableHead className="text-right">Preço compra</TableHead>
            <TableHead className="w-14" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="flex items-center gap-2 font-medium">
                  {item.name}
                  {isCritical(item) ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="size-3" /> crítico
                    </Badge>
                  ) : null}
                  {!item.is_active ? <Badge variant="secondary">inativo</Badge> : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.category?.name ?? "Sem categoria"}
                </p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {item.supplier?.name ?? "—"}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatNumber(item.quantity)} {item.unit}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {formatNumber(item.min_stock)} {item.unit}
              </TableCell>
              <TableCell className="text-right">{formatCurrency(item.purchase_price)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Ações">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onMove(item)}>
                      <ArrowLeftRight className="mr-2 size-4" /> Movimentar
                    </DropdownMenuItem>
                    {canManage ? (
                      <>
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <Pencil className="mr-2 size-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => onDelete(item)}
                        >
                          <Trash2 className="mr-2 size-4" /> Excluir
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
