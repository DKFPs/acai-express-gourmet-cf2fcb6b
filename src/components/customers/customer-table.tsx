import { Link } from "@tanstack/react-router";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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
import type { CustomerWithStats } from "@/types/customer";

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

interface Props {
  customers: CustomerWithStats[];
  canManage: boolean;
  onEdit: (customer: CustomerWithStats) => void;
  onDelete: (customer: CustomerWithStats) => void;
}

export function CustomerTable({ customers, canManage, onEdit, onDelete }: Props) {
  if (!customers.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/60 p-10 text-center text-sm text-muted-foreground">
        Nenhum cliente encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 shadow-soft">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead className="text-right">Pedidos</TableHead>
            <TableHead className="text-right">Total gasto</TableHead>
            <TableHead>Última compra</TableHead>
            <TableHead>Cadastro</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <Link
                  to="/clientes/$customerId"
                  params={{ customerId: customer.id }}
                  className="font-medium hover:underline"
                >
                  {customer.name}
                </Link>
                {!customer.is_active && (
                  <Badge variant="outline" className="ml-2">
                    Inativo
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {customer.whatsapp || customer.phone || "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {customer.city || "—"}
              </TableCell>
              <TableCell className="text-right">{customer.stats.orders_count}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(customer.stats.total_spent)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(customer.stats.last_purchase)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(customer.created_at)}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Ações do cliente">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/clientes/$customerId" params={{ customerId: customer.id }}>
                        Ver perfil
                      </Link>
                    </DropdownMenuItem>
                    {canManage && (
                      <DropdownMenuItem onClick={() => onEdit(customer)}>
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                      </DropdownMenuItem>
                    )}
                    {canManage && (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(customer)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Excluir
                      </DropdownMenuItem>
                    )}
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
