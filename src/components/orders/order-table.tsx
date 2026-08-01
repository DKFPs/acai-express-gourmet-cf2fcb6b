import { Link } from "@tanstack/react-router";
import { Eye, MoreHorizontal, Trash2 } from "lucide-react";

import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from "@/types/order";
import { OrderTableSkeleton } from "@/components/orders/order-skeletons";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

interface Props {
  orders: Order[];
  loading: boolean;
  canDelete: boolean;
  onStatusChange: (order: Order, status: OrderStatus) => void;
  onDelete: (order: Order) => void;
}

export function OrderTable({ orders, loading, canDelete, onStatusChange, onDelete }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-soft">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Data</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <OrderTableSkeleton />
          ) : orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                Nenhum pedido encontrado.
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id} className="animate-fade-in">
                <TableCell className="font-semibold text-gold">#{order.order_number}</TableCell>
                <TableCell>
                  <p className="text-sm font-medium">
                    {order.customer?.name ?? order.customer_name ?? "Consumidor"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.customer_phone ?? order.customer?.phone ?? "—"}
                  </p>
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status as OrderStatus} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod]}
                    </span>
                    <PaymentStatusBadge status={order.payment_status as never} />
                  </div>
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatCurrency(order.total)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {dateTime.format(new Date(order.created_at))}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Ações do pedido</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem asChild>
                        <Link to="/pedidos/$orderId" params={{ orderId: order.id }}>
                          <Eye className="mr-2 h-4 w-4" /> Ver detalhes
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel>Status</DropdownMenuLabel>
                      <DropdownMenuRadioGroup
                        value={order.status}
                        onValueChange={(value) => onStatusChange(order, value as OrderStatus)}
                      >
                        {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => (
                          <DropdownMenuRadioItem key={status} value={status}>
                            {ORDER_STATUS_LABELS[status]}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                      {canDelete ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(order)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
