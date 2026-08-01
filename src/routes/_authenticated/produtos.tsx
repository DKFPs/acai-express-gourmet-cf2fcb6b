import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus, Search, Tags } from "lucide-react";

import { CategoriesDialog } from "@/components/products/categories-dialog";
import { ConfirmDeleteDialog } from "@/components/products/confirm-delete-dialog";
import { ProductCards } from "@/components/products/product-cards";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import { ProductTable } from "@/components/products/product-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCategories, useProductMutations, useProducts } from "@/hooks/use-products";
import { usePermissions } from "@/hooks/use-permissions";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Product, ProductFilters } from "@/types/product";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Cadastro completo de produtos: preços, custos, margem de lucro, estoque e categorias.",
      },
      { property: "og:title", content: "Produtos — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Gerencie produtos, preços, margem de lucro e estoque do seu açaí.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProdutosPage,
});

const DEFAULT_FILTERS: ProductFilters = {
  search: "",
  categoryId: "todas",
  status: "todos",
  stock: "todos",
  page: 1,
  pageSize: 10,
};

function ProdutosPage() {
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const isMobile = useIsMobile();
  const { can } = usePermissions();
  const canManage = can("products.manage");

  const { data, isFetching, isLoading } = useProducts(filters);
  const { data: categories = [], isLoading: loadingCategories } = useCategories();
  const { remove } = useProductMutations();

  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));

  const patch = (values: Partial<ProductFilters>) =>
    setFilters((prev) => ({ ...prev, page: 1, ...values }));

  const summary = useMemo(() => {
    const low = products.filter(
      (product) => Number(product.stock_quantity) <= Number(product.min_stock),
    ).length;
    return { low };
  }, [products]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 animate-[var(--animate-fade-up)]">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} produto(s) cadastrado(s)
            {summary.low > 0 ? ` · ${summary.low} com estoque baixo nesta página` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setCategoriesOpen(true)}>
            <Tags className="h-4 w-4" /> Categorias
          </Button>
          {canManage ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Novo produto
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-3 rounded-2xl border border-border/60 bg-card/60 p-4 shadow-soft backdrop-blur md:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(event) => patch({ search: event.target.value })}
            placeholder="Pesquisar por nome ou código..."
            className="pl-9"
            aria-label="Pesquisar produtos"
          />
        </div>

        <Select value={filters.categoryId} onValueChange={(value) => patch({ categoryId: value })}>
          <SelectTrigger className="md:w-48" aria-label="Filtrar por categoria">
            <SelectValue />
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
          value={filters.status}
          onValueChange={(value) => patch({ status: value as ProductFilters["status"] })}
        >
          <SelectTrigger className="md:w-36" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.stock}
          onValueChange={(value) => patch({ stock: value as ProductFilters["stock"] })}
        >
          <SelectTrigger className="md:w-40" aria-label="Filtrar por estoque">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todo estoque</SelectItem>
            <SelectItem value="baixo">Estoque baixo</SelectItem>
            <SelectItem value="sem">Sem estoque</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isMobile ? (
        <ProductCards
          products={products}
          loading={isLoading || isFetching}
          canManage={canManage}
          onEdit={(product) => {
            setEditing(product);
            setFormOpen(true);
          }}
          onDelete={setToDelete}
        />
      ) : (
        <ProductTable
          products={products}
          loading={isLoading || isFetching}
          canManage={canManage}
          onEdit={(product) => {
            setEditing(product);
            setFormOpen(true);
          }}
          onDelete={setToDelete}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Página {filters.page} de {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(filters.pageSize)}
            onValueChange={(value) => patch({ pageSize: Number(value) })}
          >
            <SelectTrigger className="w-28" aria-label="Itens por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} / pág
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="secondary"
            size="icon"
            disabled={filters.page <= 1}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="secondary"
            size="icon"
            disabled={filters.page >= totalPages}
            onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        categories={categories}
      />

      <CategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
        loading={loadingCategories}
        canManage={canManage}
      />

      <ConfirmDeleteDialog
        open={Boolean(toDelete)}
        onOpenChange={(value) => !value && setToDelete(null)}
        title="Excluir produto?"
        description={`O produto "${toDelete?.name ?? ""}" será removido permanentemente. Esta ação não pode ser desfeita.`}
        loading={remove.isPending}
        onConfirm={async () => {
          if (!toDelete) return;
          await remove.mutateAsync({ id: toDelete.id, image_url: toDelete.image_url });
          setToDelete(null);
        }}
      />
    </div>
  );
}
