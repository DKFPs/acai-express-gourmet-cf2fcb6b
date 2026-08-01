import { MoreHorizontal, Pencil, Trash2, ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { ProductTableSkeleton } from "@/components/products/product-skeletons";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

interface ProductTableProps {
  products: Product[];
  loading: boolean;
  canManage: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductTable({
  products,
  loading,
  canManage,
  onEdit,
  onDelete,
}: ProductTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-soft backdrop-blur">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Produto</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Preço</TableHead>
            <TableHead className="text-right">Custo</TableHead>
            <TableHead className="text-right">Margem</TableHead>
            <TableHead className="text-right">Estoque</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <ProductTableSkeleton />
          ) : products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="py-14 text-center text-sm text-muted-foreground">
                Nenhum produto encontrado com os filtros atuais.
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => {
              const lowStock = Number(product.stock_quantity) <= Number(product.min_stock);
              return (
                <TableRow key={product.id} className="transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted/40">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {product.internal_code || "sem código"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.category?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(product.promo_price && "text-xs text-muted-foreground line-through")}>
                      {formatCurrency(product.price)}
                    </span>
                    {product.promo_price ? (
                      <span className="ml-2 font-semibold text-gold">
                        {formatCurrency(product.promo_price)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(product.cost)}
                  </TableCell>
                  <TableCell className="text-right font-medium text-gold">
                    {formatPercent(product.margin_percent)}
                  </TableCell>
                  <TableCell
                    className={cn("text-right", lowStock ? "font-semibold text-destructive" : "")}
                  >
                    {formatNumber(product.stock_quantity)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-full border-transparent",
                        product.status === "ativo"
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {product.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canManage ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Ações de ${product.name}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(product)}>
                            <Pencil className="h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(product)}
                          >
                            <Trash2 className="h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
