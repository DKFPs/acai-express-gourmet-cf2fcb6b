import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Phone, Receipt } from "lucide-react";

import { OrderStatusBadge, PaymentStatusBadge } from "@/components/orders/order-status-badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { ConfirmDeleteDialog } from "@/components/products/confirm-delete-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrder, useOrderMutations } from "@/hooks/use-orders";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/format";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/types/order";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/pedidos/$orderId")({
  head: () => ({
    meta: [
      { title: "Detalhe do pedido — Açaí Express Manager" },
      {
        name: "description",
        content: "Itens, pagamento, status e linha do tempo completa do pedido.",
      },
      { property: "og:title", content: "Detalhe do pedido — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Acompanhe o andamento do pedido e o histórico de status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: ({ error }) => (
    <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <p className="text-muted-foreground">Pedido não encontrado.</p>,
  component: PedidoDetalhePage,
});

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function PedidoDetalhePage() {
  const { orderId } = Route.useParams();
  const navigate = useNavigate();
  const { isAdmin } = usePermissions();
  const { data: order, isLoading } = useOrder(orderId);
  const { updateStatus, updatePayment, remove } = useOrderMutations();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading || !order) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground" asChild>
            <Link to="/pedidos">
              <ArrowLeft className="mr-1 h-4 w-4" /> Pedidos
            </Link>
          </Button>
          <h1 className="flex items-center gap-3 text-2xl font-semibold tracking-tight">
            Pedido <span className="text-gold">#{order.order_number}</span>
            <OrderStatusBadge status={order.status as OrderStatus} />
          </h1>
          <p className="text-sm text-muted-foreground">
            Criado em {dateTime.format(new Date(order.created_at))}
          </p>
        </div>
        {isAdmin ? (
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            Excluir pedido
          </Button>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Card className="rounded-2xl border-border/60 bg-card/70 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-medium">
                {order.customer?.name ?? order.customer_name ?? "Consumidor"}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                {order.customer_phone ?? order.customer?.phone ?? "Sem telefone"}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {order.delivery_address ?? "Retirada no balcão"}
              </p>
              {order.notes ? (
                <p className="rounded-xl bg-background/50 p-3 text-muted-foreground">
                  {order.notes}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/70 shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Receipt className="h-4 w-4" /> Itens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-background/40 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {Number(item.quantity)}× {item.product_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.unit_price)} un.
                      {item.notes ? ` · ${item.notes}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(item.line_total)}</span>
                </div>
              ))}

              <Separator />
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatCurrency(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Entrega</dt>
                  <dd>{formatCurrency(order.delivery_fee)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Desconto</dt>
                  <dd className="text-destructive">- {formatCurrency(order.discount)}</dd>
                </div>
                <Separator />
                <div className="flex justify-between text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="text-gold">{formatCurrency(order.total)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-border/60 bg-card/70 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Andamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={order.status}
                onValueChange={(value) =>
                  updateStatus.mutate({ id: order.id, status: value as OrderStatus })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {ORDER_STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Pagamento</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {PAYMENT_METHOD_LABELS[order.payment_method as PaymentMethod]}
                  </span>
                  <PaymentStatusBadge status={order.payment_status as PaymentStatus} />
                </div>
                <Select
                  value={order.payment_status}
                  onValueChange={(value) =>
                    updatePayment.mutate({ id: order.id, status: value as PaymentStatus })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        {PAYMENT_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-card/70 shadow-soft">
            <CardHeader>
              <CardTitle className="text-base">Linha do tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline history={order.history} currentStatus={order.status as OrderStatus} />
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Excluir pedido"
        description={`O pedido #${order.order_number} e todos os seus itens serão removidos permanentemente.`}
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(order.id, {
            onSuccess: () => {
              setConfirmOpen(false);
              void navigate({ to: "/pedidos" });
            },
          })
        }
      />
    </div>
  );
}
