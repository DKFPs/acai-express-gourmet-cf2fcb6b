import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  type OrderStatus,
  type PaymentStatus,
} from "@/types/order";

const STATUS_STYLES: Record<OrderStatus, string> = {
  recebido: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  preparando: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  saiu_entrega: "border-primary/50 bg-primary/15 text-primary-foreground",
  entregue: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  cancelado: "border-destructive/40 bg-destructive/15 text-destructive",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  pendente: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  pago: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  estornado: "border-destructive/40 bg-destructive/15 text-destructive",
};

export function OrderStatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("rounded-full font-medium", STATUS_STYLES[status], className)}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge variant="outline" className={cn("rounded-full font-medium", PAYMENT_STYLES[status])}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
