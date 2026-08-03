import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Package, Plus, Repeat2, Search, TrendingUp, Truck } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/products/confirm-delete-dialog";
import {
  PurchaseDialog,
  type PurchaseDialogDefaults,
} from "@/components/purchases/purchase-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCategories } from "@/hooks/use-products";
import { usePermissions } from "@/hooks/use-permissions";
import { usePackaging } from "@/hooks/use-production";
import { usePurchaseMutations, usePurchases } from "@/hooks/use-purchases";
import { useAllIngredients, useSuppliers } from "@/hooks/use-stock";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  PURCHASE_KIND_LABELS,
  type Purchase,
  type PurchaseFilters,
} from "@/types/purchase";

export const Route = createFileRoute("/_authenticated/compras")({
  head: () => ({
    meta: [
      { title: "Compras — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Registre compras de ingredientes e embalagens com entrada automática no estoque, custo médio e recálculo de receitas.",
      },
      { property: "og:title", content: "Compras — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Histórico de compras, indicadores de gastos, fornecedores e itens mais comprados.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComprasPage,
});

const DEFAULT_FILTERS: PurchaseFilters = {
  search: "",
  supplierId: "todos",
  kind: "todos",
  from: "",
  to: "",
};

function ComprasPage() {
  const { can } = usePermissions();
  const canManage = can("stock.manage");

  const [filters, setFilters] = useState<PurchaseFilters>(DEFAULT_FILTERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [defaults, setDefaults] = useState<PurchaseDialogDefaults | null>(null);
  const [toDelete, setToDelete] = useState<Purchase | null>(null);

  const purchases = usePurchases(filters);
  const suppliers = useSuppliers();
  const ingredients = useAllIngredients();
  const packaging = usePackaging();
  const categories = useCategories();
  const { create, remove } = usePurchaseMutations();

  const rows = purchases.data ?? [];

  const indicators = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthRows = rows.filter((row) => row.purchase_date.startsWith(monthKey));
    const monthTotal = monthRows.reduce((sum, row) => sum + Number(row.total_value), 0);

    const bySupplier = new Map<string, number>();
    const byItem = new Map<string, { quantity: number; unit: string }>();
    for (const row of rows) {
      const supplierName = row.supplier?.name ?? row.supplier_name ?? "Sem fornecedor";
      bySupplier.set(supplierName, (bySupplier.get(supplierName) ?? 0) + Number(row.total_value));
      const current = byItem.get(row.item_name) ?? { quantity: 0, unit: row.unit };
      byItem.set(row.item_name, {
        quantity: current.quantity + Number(row.quantity),
        unit: row.unit,
      });
    }

    const topSupplierEntry = [...bySupplier.entries()].sort((a, b) => b[1] - a[1])[0];
    const topItemEntry = [...byItem.entries()].sort((a, b) => b[1].quantity - a[1].quantity)[0];

    return {
      monthTotal,
      monthCount: monthRows.length,
      topSupplier: topSupplierEntry
        ? { name: topSupplierEntry[0], total: topSupplierEntry[1] }
        : null,
      topItem: topItemEntry
        ? {
            name: topItemEntry[0],
            quantity: topItemEntry[1].quantity,
            unit: topItemEntry[1].unit,
          }
        : null,
    };
  }, [rows]);

  const openNew = () => {
    setDefaults(null);
    setDialogOpen(true);
  };

  const repeatPurchase = (purchase: Purchase) => {
    setDefaults({
      supplier_id: purchase.supplier_id ?? "",
      kind: purchase.kind,
      item_id: (purchase.kind === "ingrediente" ? purchase.ingredient_id : purchase.packaging_id) ?? "",
      category_id: purchase.category_id ?? "",
      quantity: String(purchase.quantity),
      unit: purchase.unit,
      total_value: String(purchase.total_value),
      notes: purchase.notes ?? "",
    });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compras</h1>
          <p className="text-sm text-muted-foreground">
            Registre compras em segundos: o estoque, o custo médio e as receitas são atualizados
            automaticamente.
          </p>
        </div>
        {canManage ? (
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> Nova compra
          </Button>
        ) : null}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gasto no mês
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(indicators.monthTotal)}</p>
            <p className="text-xs text-muted-foreground">{indicators.monthCount} compras</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fornecedor que mais vendeu
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{indicators.topSupplier?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {indicators.topSupplier ? formatCurrency(indicators.topSupplier.total) : "Sem dados"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Produto mais comprado
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{indicators.topItem?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {indicators.topItem
                ? `${formatNumber(indicators.topItem.quantity)} ${indicators.topItem.unit}`
                : "Sem dados"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Pesquisar produto"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
            />
          </div>
          <Select
            value={filters.supplierId}
            onValueChange={(value) => setFilters((prev) => ({ ...prev, supplierId: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os fornecedores</SelectItem>
              {(suppliers.data ?? []).map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.kind}
            onValueChange={(value) =>
              setFilters((prev) => ({ ...prev, kind: value as PurchaseFilters["kind"] }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="ingrediente">Ingredientes</SelectItem>
              <SelectItem value="embalagem">Embalagens</SelectItem>
            </SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((prev) => ({ ...prev, from: event.target.value }))}
            />
            <Input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((prev) => ({ ...prev, to: event.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de compras</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma compra registrada com esses filtros.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Qtd.</TableHead>
                    <TableHead className="text-right">Custo unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(`${row.purchase_date}T12:00:00`).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{row.item_name}</div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">{PURCHASE_KIND_LABELS[row.kind]}</Badge>
                          {row.category?.name ? <span>{row.category.name}</span> : null}
                        </div>
                        {row.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">{row.notes}</p>
                        ) : null}
                      </TableCell>
                      <TableCell>{row.supplier?.name ?? row.supplier_name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        {formatNumber(row.quantity)} {row.unit}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(row.unit_cost)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.total_value)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canManage ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => repeatPurchase(row)}
                              title="Comprar novamente"
                            >
                              <Repeat2 className="mr-1 h-4 w-4" /> Comprar novamente
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PurchaseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        suppliers={suppliers.data ?? []}
        ingredients={ingredients.data ?? []}
        packaging={packaging.data ?? []}
        categories={categories.data ?? []}
        defaults={defaults}
        loading={create.isPending}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: () => {
              setDialogOpen(false);
              setDefaults(null);
            },
          })
        }
      />

      <ConfirmDeleteDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Excluir compra"
        description="A entrada de estoque já registrada não será revertida."
        loading={remove.isPending}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />
    </div>
  );
}
