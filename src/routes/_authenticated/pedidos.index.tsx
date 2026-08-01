import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/products/confirm-delete-dialog";
import { OrderCards } from "@/components/orders/order-cards";
import { OrderCardsSkeleton } from "@/components/orders/order-skeletons";
import { OrderTable } from "@/components/orders/order-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOrderMutations, useOrders } from "@/hooks/use-orders";
import { usePermissions } from "@/hooks/use-permissions";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type Order,
  type OrderFilters,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@/types/order";

export const Route = createFileRoute("/_authenticated/pedidos/")({
  head: () => ({
    meta: [
      { title: "Pedidos — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Acompanhe todos os pedidos com filtros, pesquisa, ordenação, status e histórico completo.",
      },
      { property: "og:title", content: "Pedidos — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Gestão de pedidos do delivery: status, pagamentos e linha do tempo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PedidosPage,
});

const DEFAULT_FILTERS: OrderFilters = {
  search: "",
  status: "todos",
  paymentMethod: "todas",
  paymentStatus: "todos",
  sort: "recentes",
  page: 1,
  pageSize: 10,
};

function PedidosPage() {
  const [filters, setFilters] = useState<OrderFilters>(DEFAULT_FILTERS);
  const [toDelete, setToDelete] = useState<Order | null>(null);
  const isMobile = useIsMobile();
  const { isAdmin } = usePermissions();
  const { data, isLoading } = useOrders(filters);
  const { updateStatus, remove } = useOrderMutations();

  const orders = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const patch = (values: Partial<OrderFilters>) =>
    setFilters((prev) => ({ ...prev, page: 1, ...values }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
          <p className="text-sm text-muted-foreground">
            {total} pedido{total === 1 ? "" : "s"} registrado{total === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link to="/pedidos/novo">
            <Plus className="mr-2 h-4 w-4" /> Novo pedido
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-soft md:grid-cols-2 xl:grid-cols-5">
        <div className="relative md:col-span-2 xl:col-span-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nº, cliente ou telefone"
            value={filters.search}
            onChange={(event) => patch({ search: event.target.value })}
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) => patch({ status: value as OrderStatus | "todos" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.paymentMethod}
          onValueChange={(value) => patch({ paymentMethod: value as PaymentMethod | "todas" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Forma de pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as formas</SelectItem>
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
              <SelectItem key={method} value={method}>
                {PAYMENT_METHOD_LABELS[method]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.paymentStatus}
          onValueChange={(value) => patch({ paymentStatus: value as PaymentStatus | "todos" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Pagamento: todos</SelectItem>
            {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {PAYMENT_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.sort}
          onValueChange={(value) => patch({ sort: value as OrderFilters["sort"] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recentes">Mais recentes</SelectItem>
            <SelectItem value="antigos">Mais antigos</SelectItem>
            <SelectItem value="maior_valor">Maior valor</SelectItem>
            <SelectItem value="menor_valor">Menor valor</SelectItem>
            <SelectItem value="numero">Número do pedido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isMobile ? (
        isLoading ? (
          <OrderCardsSkeleton />
        ) : (
          <OrderCards orders={orders} />
        )
      ) : (
        <OrderTable
          orders={orders}
          loading={isLoading}
          canDelete={isAdmin}
          onStatusChange={(order, status) => updateStatus.mutate({ id: order.id, status })}
          onDelete={setToDelete}
        />
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Página {filters.page} de {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={filters.page <= 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={filters.page >= totalPages}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmDeleteDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Excluir pedido"
        description={`O pedido #${toDelete?.order_number ?? ""} e todos os seus itens serão removidos permanentemente.`}
        loading={remove.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
