import { Link } from "@tanstack/react-router";
import { MapPin, Pencil, Phone, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/components/customers/customer-table";
import type { CustomerWithStats } from "@/types/customer";

interface Props {
  customers: CustomerWithStats[];
  canManage: boolean;
  onEdit: (customer: CustomerWithStats) => void;
  onDelete: (customer: CustomerWithStats) => void;
}

export function CustomerCards({ customers, canManage, onEdit, onDelete }: Props) {
  if (!customers.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/60 p-8 text-center text-sm text-muted-foreground">
        Nenhum cliente encontrado.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {customers.map((customer) => (
        <div
          key={customer.id}
          className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-soft"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link
                to="/clientes/$customerId"
                params={{ customerId: customer.id }}
                className="text-base font-semibold hover:underline"
              >
                {customer.name}
              </Link>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" />
                {customer.whatsapp || customer.phone || "Sem contato"}
              </p>
              {customer.city && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {customer.city}
                </p>
              )}
            </div>
            {!customer.is_active && <Badge variant="outline">Inativo</Badge>}
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Pedidos</p>
              <p className="text-sm font-semibold">{customer.stats.orders_count}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total gasto</p>
              <p className="text-sm font-semibold">{formatCurrency(customer.stats.total_spent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Última</p>
              <p className="text-sm font-semibold">{formatDate(customer.stats.last_purchase)}</p>
            </div>
          </div>

          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(customer)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => onDelete(customer)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
