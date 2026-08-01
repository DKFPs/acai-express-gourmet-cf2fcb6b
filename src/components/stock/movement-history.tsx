import { ArrowDownRight, ArrowUpRight, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/format";
import { MOVEMENT_LABELS, type MovementType, type StockMovement } from "@/types/stock";

const ICONS: Record<MovementType, typeof ArrowUpRight> = {
  entrada: ArrowUpRight,
  saida: ArrowDownRight,
  ajuste: SlidersHorizontal,
};

export function MovementHistory({ movements }: { movements: StockMovement[] }) {
  if (movements.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        Nenhuma movimentação registrada.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Ingrediente</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead>Motivo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {movements.map((movement) => {
            const Icon = ICONS[movement.type as MovementType];
            return (
              <TableRow key={movement.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {new Date(movement.created_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="font-medium">{movement.ingredient?.name ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={movement.type === "saida" ? "destructive" : "secondary"}
                    className="gap-1"
                  >
                    <Icon className="size-3" />
                    {MOVEMENT_LABELS[movement.type as MovementType]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(movement.quantity)} {movement.ingredient?.unit ?? ""}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(movement.total_cost)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {movement.reason ?? "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
