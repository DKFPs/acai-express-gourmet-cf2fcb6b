import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { CustomerDialog } from "@/components/customers/customer-dialog";
import { CustomerDetailSkeleton } from "@/components/customers/customer-skeletons";
import { formatDate } from "@/components/customers/customer-table";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { ConfirmDeleteDialog } from "@/components/products/confirm-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomerCrud, useCustomerDetail } from "@/hooks/use-customers";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/types/order";

export const Route = createFileRoute("/_authenticated/clientes/$customerId")({
  head: () => ({
    meta: [
      { title: "Perfil do cliente — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Estatísticas do cliente, ticket médio, total gasto e histórico completo de compras.",
      },
      { property: "og:title", content: "Perfil do cliente — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Veja compras, contatos e indicadores de consumo do cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClienteDetalhePage,
  errorComponent: () => (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-10 text-center">
      <p className="text-sm text-muted-foreground">Não foi possível carregar este cliente.</p>
      <Button asChild className="mt-4" variant="outline">
        <Link to="/clientes">Voltar para clientes</Link>
      </Button>
    </div>
  ),
  notFoundComponent: () => (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-10 text-center text-sm text-muted-foreground">
      Cliente não encontrado.
    </div>
  ),
});

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="rounded-2xl border-border/60 bg-card/60 shadow-soft">
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function ClienteDetalhePage() {
  const { customerId } = Route.useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canManage = can("customers.manage");
  const canDelete = can("customers.delete");

  const { data: customer, isLoading } = useCustomerDetail(customerId);
  const { remove } = useCustomerCrud();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading || !customer) return <CustomerDetailSkeleton />;

  const contacts = [
    { icon: Phone, value: customer.phone },
    { icon: MessageCircle, value: customer.whatsapp },
    { icon: Mail, value: customer.email },
    {
      icon: MapPin,
      value: [customer.address, customer.city, customer.zip_code].filter(Boolean).join(" · "),
    },
    { icon: CalendarDays, value: `Cliente desde ${formatDate(customer.created_at)}` },
  ].filter((item) => Boolean(item.value));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button asChild variant="ghost" size="icon" aria-label="Voltar">
            <Link to="/clientes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
              {!customer.is_active && <Badge variant="outline">Inativo</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {customer.stats.orders_count} pedido{customer.stats.orders_count === 1 ? "" : "s"} ·{" "}
              {formatCurrency(customer.stats.total_spent)} em compras
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
          )}
          <Button asChild>
            <Link to="/pedidos/novo">
              <ShoppingBag className="mr-2 h-4 w-4" /> Novo pedido
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total gasto" value={formatCurrency(customer.stats.total_spent)} />
        <StatCard label="Pedidos" value={String(customer.stats.orders_count)} />
        <StatCard label="Ticket médio" value={formatCurrency(customer.averageTicket)} />
        <StatCard
          label="Última compra"
          value={formatDate(customer.stats.last_purchase)}
          hint={customer.firstPurchase ? `Primeira: ${formatDate(customer.firstPurchase)}` : undefined}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="rounded-2xl border-border/60 bg-card/60 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados de contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {contacts.map((item, index) => (
              <p key={index} className="flex items-start gap-2 text-muted-foreground">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-foreground">{item.value}</span>
              </p>
            ))}
            {customer.notes && (
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Observações</p>
                <p className="mt-1 text-sm">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/60 bg-card/60 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico de compras</CardTitle>
          </CardHeader>
          <CardContent>
            {!customer.orders.length ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Este cliente ainda não realizou pedidos.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link
                            to="/pedidos/$orderId"
                            params={{ orderId: order.id }}
                            className="font-medium hover:underline"
                          >
                            #{order.order_number}
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <OrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {PAYMENT_METHOD_LABELS[order.payment_method]}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(order.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CustomerDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} />

      <ConfirmDeleteDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir cliente"
        description={`Tem certeza que deseja excluir ${customer.name}? Essa ação não pode ser desfeita.`}
        loading={remove.isPending}
        onConfirm={async () => {
          await remove.mutateAsync(customer.id);
          setConfirmDelete(false);
          void navigate({ to: "/clientes" });
        }}
      />
    </div>
  );
}
