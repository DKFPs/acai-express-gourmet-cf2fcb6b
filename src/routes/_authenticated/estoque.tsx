import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeftRight, Plus, Search, Truck } from "lucide-react";

import { ConfirmDeleteDialog } from "@/components/products/confirm-delete-dialog";
import { IngredientCards } from "@/components/stock/ingredient-cards";
import { IngredientDialog } from "@/components/stock/ingredient-dialog";
import { IngredientTable, isCritical } from "@/components/stock/ingredient-table";
import { MovementDialog } from "@/components/stock/movement-dialog";
import { MovementHistory } from "@/components/stock/movement-history";
import { StockCharts } from "@/components/stock/stock-charts";
import {
  StockCardsSkeleton,
  StockChartsSkeleton,
  StockTableSkeleton,
} from "@/components/stock/stock-skeletons";
import { SupplierDialog } from "@/components/stock/supplier-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCategories } from "@/hooks/use-products";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useAllIngredients,
  useIngredientMutations,
  useIngredients,
  useMovementMutations,
  useMovements,
  useSupplierMutations,
  useSuppliers,
} from "@/hooks/use-stock";
import { formatCurrency } from "@/lib/format";
import type { Ingredient, IngredientFilters, StockLevelFilter, SupplierRow } from "@/types/stock";
import { PageHeader } from "@/components/common/page-header";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Controle de estoque de ingredientes: fornecedores, movimentações, alertas críticos e gráficos.",
      },
      { property: "og:title", content: "Estoque — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Ingredientes, fornecedores, entradas, saídas, ajustes e alertas de estoque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EstoquePage,
});

const DEFAULT_FILTERS: IngredientFilters = {
  search: "",
  supplierId: "todos",
  categoryId: "todas",
  level: "todos",
  page: 1,
  pageSize: 10,
};

function EstoquePage() {
  const [filters, setFilters] = useState<IngredientFilters>(DEFAULT_FILTERS);
  const [ingredientOpen, setIngredientOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);
  const [toDelete, setToDelete] = useState<Ingredient | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementTarget, setMovementTarget] = useState<string | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRow | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierRow | null>(null);
  const [historyIngredient, setHistoryIngredient] = useState("todos");
  const [historyType, setHistoryType] = useState("todos");

  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const canManage = can("stock.manage");

  const { data, isLoading } = useIngredients(filters);
  const { data: allIngredients = [], isLoading: loadingAll } = useAllIngredients();
  const { data: suppliers = [] } = useSuppliers();
  const { data: categories = [] } = useCategories();
  const { data: movements = [], isLoading: loadingMovements } = useMovements({
    ingredientId: historyIngredient,
    type: historyType,
    limit: 200,
  });

  const ingredientMutations = useIngredientMutations();
  const supplierMutations = useSupplierMutations();
  const movementMutations = useMovementMutations();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const criticals = useMemo(() => allIngredients.filter(isCritical), [allIngredients]);
  const stockValue = useMemo(
    () =>
      allIngredients.reduce(
        (sum, item) => sum + Number(item.quantity) * Number(item.purchase_price),
        0,
      ),
    [allIngredients],
  );

  const patch = (values: Partial<IngredientFilters>) =>
    setFilters((prev) => ({ ...prev, page: 1, ...values }));

  const openMovement = (ingredient?: Ingredient) => {
    setMovementTarget(ingredient?.id ?? null);
    setMovementOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque"
        description="Ingredientes, fornecedores e movimentações com baixa automática nas vendas."
        actions={
          <>
            <Button variant="secondary" onClick={() => openMovement()}>
              <ArrowLeftRight className="mr-2 size-4" /> Movimentação
            </Button>
            {canManage ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setIngredientOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" /> Novo ingrediente
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ingredientes cadastrados</p>
            <p className="text-2xl font-semibold">{allIngredients.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Em estoque crítico</p>
            <p className="text-2xl font-semibold text-destructive">{criticals.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Valor em estoque</p>
            <p className="text-2xl font-semibold">{formatCurrency(stockValue)}</p>
          </CardContent>
        </Card>
      </div>

      {criticals.length > 0 ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTriangle className="size-4" />
          <AlertTitle>Estoque crítico</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              {criticals.slice(0, 8).map((item) => (
                <Badge key={item.id} variant="destructive">
                  {item.name}: {Number(item.quantity)} {item.unit}
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="ingredientes">
        <TabsList>
          <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
          <TabsTrigger value="movimentacoes">Histórico</TabsTrigger>
          <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredientes" className="space-y-4 pt-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Pesquisar ingrediente"
                value={filters.search}
                onChange={(event) => patch({ search: event.target.value })}
              />
            </div>
            <Select
              value={filters.supplierId}
              onValueChange={(value) => patch({ supplierId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os fornecedores</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.categoryId}
              onValueChange={(value) => patch({ categoryId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.level}
              onValueChange={(value) => patch({ level: value as StockLevelFilter })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo o estoque</SelectItem>
                <SelectItem value="critico">Estoque crítico</SelectItem>
                <SelectItem value="zerado">Zerado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            isMobile ? (
              <StockCardsSkeleton />
            ) : (
              <StockTableSkeleton />
            )
          ) : isMobile ? (
            <IngredientCards
              items={items}
              canManage={canManage}
              onEdit={(item) => {
                setEditing(item);
                setIngredientOpen(true);
              }}
              onDelete={setToDelete}
              onMove={openMovement}
            />
          ) : (
            <IngredientTable
              items={items}
              canManage={canManage}
              onEdit={(item) => {
                setEditing(item);
                setIngredientOpen(true);
              }}
              onDelete={setToDelete}
              onMove={openMovement}
            />
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total} {total === 1 ? "ingrediente" : "ingredientes"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Anterior
              </Button>
              <span>
                {filters.page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Próxima
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="movimentacoes" className="space-y-4 pt-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Select value={historyIngredient} onValueChange={setHistoryIngredient}>
              <SelectTrigger>
                <SelectValue placeholder="Ingrediente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os ingredientes</SelectItem>
                {allIngredients.map((ingredient) => (
                  <SelectItem key={ingredient.id} value={ingredient.id}>
                    {ingredient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={historyType} onValueChange={setHistoryType}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loadingMovements ? <StockTableSkeleton /> : <MovementHistory movements={movements} />}
        </TabsContent>

        <TabsContent value="fornecedores" className="space-y-4 pt-4">
          {canManage ? (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditingSupplier(null);
                  setSupplierOpen(true);
                }}
              >
                <Truck className="mr-2 size-4" /> Novo fornecedor
              </Button>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      {supplier.name}
                      {!supplier.is_active ? (
                        <Badge variant="secondary" className="ml-2">
                          inativo
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{supplier.phone ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{supplier.email ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {canManage ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingSupplier(supplier);
                              setSupplierOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => setSupplierToDelete(supplier)}
                          >
                            Excluir
                          </Button>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      Nenhum fornecedor cadastrado.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="graficos" className="pt-4">
          {loadingAll || loadingMovements ? (
            <StockChartsSkeleton />
          ) : (
            <StockCharts ingredients={allIngredients} movements={movements} />
          )}
        </TabsContent>
      </Tabs>

      <IngredientDialog
        open={ingredientOpen}
        onOpenChange={setIngredientOpen}
        ingredient={editing}
        suppliers={suppliers}
        categories={categories}
        loading={ingredientMutations.create.isPending || ingredientMutations.update.isPending}
        onSubmit={(input) => {
          if (editing) {
            ingredientMutations.update.mutate(
              { id: editing.id, input },
              { onSuccess: () => setIngredientOpen(false) },
            );
          } else {
            ingredientMutations.create.mutate(input, {
              onSuccess: () => setIngredientOpen(false),
            });
          }
        }}
      />

      <SupplierDialog
        open={supplierOpen}
        onOpenChange={setSupplierOpen}
        supplier={editingSupplier}
        loading={supplierMutations.create.isPending || supplierMutations.update.isPending}
        onSubmit={(input) => {
          if (editingSupplier) {
            supplierMutations.update.mutate(
              { id: editingSupplier.id, input },
              { onSuccess: () => setSupplierOpen(false) },
            );
          } else {
            supplierMutations.create.mutate(input, { onSuccess: () => setSupplierOpen(false) });
          }
        }}
      />

      <MovementDialog
        open={movementOpen}
        onOpenChange={setMovementOpen}
        ingredients={allIngredients}
        defaultIngredientId={movementTarget}
        loading={movementMutations.create.isPending}
        onSubmit={(input) =>
          movementMutations.create.mutate(input, { onSuccess: () => setMovementOpen(false) })
        }
      />

      <ConfirmDeleteDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Excluir ingrediente"
        description={`Tem certeza que deseja excluir "${toDelete?.name ?? ""}"? As movimentações relacionadas também serão removidas.`}
        loading={ingredientMutations.remove.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          ingredientMutations.remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null) });
        }}
      />

      <ConfirmDeleteDialog
        open={Boolean(supplierToDelete)}
        onOpenChange={(open) => !open && setSupplierToDelete(null)}
        title="Excluir fornecedor"
        description={`Tem certeza que deseja excluir "${supplierToDelete?.name ?? ""}"?`}
        loading={supplierMutations.remove.isPending}
        onConfirm={() => {
          if (!supplierToDelete) return;
          supplierMutations.remove.mutate(supplierToDelete.id, {
            onSuccess: () => setSupplierToDelete(null),
          });
        }}
      />
    </div>
  );
}
