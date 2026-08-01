import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Search, Users } from "lucide-react";

import { CustomerCards } from "@/components/customers/customer-cards";
import { CustomerDialog } from "@/components/customers/customer-dialog";
import { CustomerRanking } from "@/components/customers/customer-ranking";
import {
  CustomerCardsSkeleton,
  CustomerTableSkeleton,
} from "@/components/customers/customer-skeletons";
import { CustomerTable } from "@/components/customers/customer-table";
import { ConfirmDeleteDialog } from "@/components/products/confirm-delete-dialog";
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
import { useCustomerCrud, useCustomerList, useCustomerRanking } from "@/hooks/use-customers";
import { usePermissions } from "@/hooks/use-permissions";
import { formatCurrency } from "@/lib/format";
import {
  CUSTOMER_SORT_LABELS,
  type CustomerFilters,
  type CustomerSort,
  type CustomerWithStats,
} from "@/types/customer";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Cadastro completo de clientes com pesquisa, filtros, ranking dos melhores compradores e estatísticas de consumo.",
      },
      { property: "og:title", content: "Clientes — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Gestão de clientes: contatos, histórico de compras e ranking de fidelidade.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientesPage,
});

const DEFAULT_FILTERS: CustomerFilters = {
  search: "",
  status: "todos",
  city: "todas",
  hasOrders: "todos",
  sort: "nome",
  page: 1,
  pageSize: 10,
};

function ClientesPage() {
  const [filters, setFilters] = useState<CustomerFilters>(DEFAULT_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerWithStats | null>(null);
  const [toDelete, setToDelete] = useState<CustomerWithStats | null>(null);

  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const canManage = can("customers.manage");

  const { data, isLoading } = useCustomerList(filters);
  const { data: ranking, isLoading: rankingLoading } = useCustomerRanking(5);
  const { remove } = useCustomerCrud();

  const customers = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const customer of ranking ?? []) if (customer.city) set.add(customer.city);
    for (const customer of customers) if (customer.city) set.add(customer.city);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [customers, ranking]);

  const totalRevenue = (ranking ?? []).reduce((sum, c) => sum + c.stats.total_spent, 0);

  const patch = (values: Partial<CustomerFilters>) =>
    setFilters((prev) => ({ ...prev, page: 1, ...values }));

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (customer: CustomerWithStats) => {
    setEditing(customer);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {total} cliente{total === 1 ? "" : "s"} · top 5 somam {formatCurrency(totalRevenue)}
          </p>
        </div>
        {canManage && (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Novo cliente
          </Button>
        )}
      </div>

      <div className="grid gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-soft md:grid-cols-2 xl:grid-cols-5">
        <div className="relative md:col-span-2 xl:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, telefone, WhatsApp ou cidade"
            value={filters.search}
            onChange={(event) => patch({ search: event.target.value })}
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) => patch({ status: value as CustomerFilters["status"] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Situação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as situações</SelectItem>
            <SelectItem value="ativos">Ativos</SelectItem>
            <SelectItem value="inativos">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.city} onValueChange={(value) => patch({ city: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Cidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as cidades</SelectItem>
            {cities.map((city) => (
              <SelectItem key={city} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.hasOrders}
          onValueChange={(value) => patch({ hasOrders: value as CustomerFilters["hasOrders"] })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Compras" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Com ou sem pedidos</SelectItem>
            <SelectItem value="com">Já compraram</SelectItem>
            <SelectItem value="sem">Nunca compraram</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.sort}
          onValueChange={(value) => patch({ sort: value as CustomerSort })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Ordenar" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CUSTOMER_SORT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {isLoading ? (
            isMobile ? (
              <CustomerCardsSkeleton />
            ) : (
              <CustomerTableSkeleton />
            )
          ) : isMobile ? (
            <CustomerCards
              customers={customers}
              canManage={canManage}
              onEdit={openEdit}
              onDelete={setToDelete}
            />
          ) : (
            <CustomerTable
              customers={customers}
              canManage={canManage}
              onEdit={openEdit}
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
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                aria-label="Próxima página"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <CustomerRanking customers={ranking ?? []} loading={rankingLoading} />
          <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground shadow-soft">
            <Users className="mt-0.5 h-4 w-4 text-primary" />
            <p>
              Toque em um cliente para ver estatísticas detalhadas e o histórico completo de
              compras.
            </p>
          </div>
        </div>
      </div>

      <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editing} />

      <ConfirmDeleteDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Excluir cliente"
        description={`Tem certeza que deseja excluir ${toDelete?.name ?? ""}? Essa ação não pode ser desfeita.`}
        loading={remove.isPending}
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await remove.mutateAsync(toDelete.id);
          } finally {
            setToDelete(null);
          }
        }}
      />
    </div>
  );
}
