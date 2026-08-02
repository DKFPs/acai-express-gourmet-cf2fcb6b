import { CheckCircle2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
import { formatCurrency } from "@/lib/format";
import { STATUS_LABEL, TYPE_LABEL, type FinancialEntry } from "@/types/finance";

export function formatDay(value: string | null) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return date.toLocaleDateString("pt-BR");
}

export function isOverdue(entry: FinancialEntry) {
  return entry.status === "pendente" && entry.due_date < new Date().toISOString().slice(0, 10);
}

export function StatusBadge({ entry }: { entry: FinancialEntry }) {
  if (entry.status === "pago") return <Badge className="bg-emerald-600 text-white">Pago</Badge>;
  if (entry.status === "cancelado") return <Badge variant="outline">Cancelado</Badge>;
  return (
    <Badge variant={isOverdue(entry) ? "destructive" : "secondary"}>
      {isOverdue(entry) ? "Vencido" : STATUS_LABEL.pendente}
    </Badge>
  );
}

interface EntryTableProps {
  items: FinancialEntry[];
  canManage: boolean;
  onEdit: (entry: FinancialEntry) => void;
  onDelete: (entry: FinancialEntry) => void;
  onSettle: (entry: FinancialEntry) => void;
}

export function EntryTable({ items, canManage, onEdit, onDelete, onSettle }: EntryTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vencimento</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="hidden md:table-cell">Categoria</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap">{formatDay(entry.due_date)}</TableCell>
              <TableCell>
                <p className="font-medium">{entry.description}</p>
                {entry.supplier?.name ? (
                  <p className="text-xs text-muted-foreground">{entry.supplier.name}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{TYPE_LABEL[entry.type]}</Badge>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <span className="inline-flex items-center gap-2 text-sm">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: entry.category?.color ?? "#6D28D9" }}
                  />
                  {entry.category?.name ?? "—"}
                </span>
              </TableCell>
              <TableCell>
                <StatusBadge entry={entry} />
              </TableCell>
              <TableCell
                className={`text-right font-semibold ${
                  entry.type === "receita" ? "text-emerald-500" : "text-destructive"
                }`}
              >
                {entry.type === "receita" ? "+" : "−"} {formatCurrency(entry.amount)}
              </TableCell>
              <TableCell>
                {canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {entry.status === "pendente" ? (
                        <DropdownMenuItem onClick={() => onSettle(entry)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como pago
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem onClick={() => onEdit(entry)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(entry)}>
                        <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                Nenhum lançamento encontrado.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
