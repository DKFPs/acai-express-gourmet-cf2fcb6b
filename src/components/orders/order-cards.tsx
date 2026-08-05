import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/order-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import {
  PAYMENT_METHOD_LABELS,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from "@/types/order";

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function OrderCards({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return (
      <Card className="rounded-2xl border-border/60 bg-card/70">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhum pedido encontrado.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {orders.map((order) => (
        <Link key={order.id} to="/pedidos/$orderId" params={{ orderId: order.id }}>
          <Card className="animate-fade-in rounded-2xl border-border/60 bg-card/70 shadow-soft transition hover:border-primary/50">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gold">#{order.order_number}</span>
                <OrderStatusBadge status={order.status as OrderStatus} />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {order.customer?.name ?? order.customer_name ?? "Consumidor"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {dateTime.format(new Date(order.created_at))} ·{" "}
                  {PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod]}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <PaymentStatusBadge status={order.payment_status as never} />
                <span className="flex items-center gap-1 text-base font-semibold">
                  {formatCurrency(order.total)}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
