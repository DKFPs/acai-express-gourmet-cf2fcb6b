import { ImageIcon, Pencil, Trash2 } from "lucide-react";

import { ProductCardsSkeleton } from "@/components/products/product-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

interface ProductCardsProps {
  products: Product[];
  loading: boolean;
  canManage: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductCards({
  products,
  loading,
  canManage,
  onEdit,
  onDelete,
}: ProductCardsProps) {
  if (loading) return <ProductCardsSkeleton />;

  if (products.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed border-border/70 bg-card/50">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum produto encontrado com os filtros atuais.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3">
      {products.map((product) => {
        const lowStock = Number(product.stock_quantity) <= Number(product.min_stock);
        return (
          <Card
            key={product.id}
            className="rounded-2xl border-border/60 bg-card/70 shadow-soft backdrop-blur transition-transform active:scale-[0.99]"
          >
            <CardContent className="flex gap-4 p-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted/40">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.category?.name ?? "Sem categoria"} ·{" "}
                      {product.internal_code || "sem código"}
                    </p>
                  </div>
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
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className={cn("font-semibold", product.promo_price && "text-gold")}>
                    {formatCurrency(product.promo_price ?? product.price)}
                  </span>
                  {product.promo_price ? (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatCurrency(product.price)}
                    </span>
                  ) : null}
                  <span className="text-xs text-gold">
                    margem {formatPercent(product.margin_percent)}
                  </span>
                  <span
                    className={cn(
                      "text-xs",
                      lowStock ? "font-semibold text-destructive" : "text-muted-foreground",
                    )}
                  >
                    estoque {formatNumber(product.stock_quantity)}
                  </span>
                </div>

                {canManage ? (
                  <div className="flex gap-2 pt-2">
                    <Button variant="secondary" size="sm" onClick={() => onEdit(product)}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onDelete(product)}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
