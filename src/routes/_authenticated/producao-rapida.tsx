import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { History, Package, Repeat, Zap } from "lucide-react";

import { QuickProduceDialog } from "@/components/production/quick-produce-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  useFinishedProducts,
  useProduceBatch,
  useProductionBatches,
  useRecipes,
} from "@/hooks/use-production";
import type { Recipe } from "@/types/production";

export const Route = createFileRoute("/_authenticated/producao-rapida")({
  component: QuickProductionPage,
  head: () => ({
    meta: [
      { title: "Produção Rápida — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Produza lotes em um clique: escolha a receita, confirme o resumo e o sistema baixa ingredientes e embalagens automaticamente.",
      },
      { property: "og:title", content: "Produção Rápida — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Produção simplificada por receita com baixa automática de estoque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function nowLocal() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function QuickProductionPage() {
  const { data: recipes = [], isLoading } = useRecipes();
  const { data: finished = [] } = useFinishedProducts();
  const { data: batches = [] } = useProductionBatches(10);
  const produce = useProduceBatch();

  const [selected, setSelected] = useState<Recipe | null>(null);

  const availableByRecipe = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of finished) {
      if (!item.recipe_id) continue;
      map.set(item.recipe_id, (map.get(item.recipe_id) ?? 0) + Number(item.quantity_available ?? 0));
    }
    return map;
  }, [finished]);

  const lastBatch = batches[0] ?? null;

  const run = (recipeId: string, quantity: number) => {
    produce.mutate(
      { recipe_id: recipeId, batches: quantity, produced_at: nowLocal(), notes: null },
      { onSuccess: () => setSelected(null) },
    );
  };

  const activeRecipes = recipes.filter((recipe) => recipe.status === "ativo");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Zap className="size-6 text-primary" /> Produção Rápida
          </h1>
          <p className="text-sm text-muted-foreground">
            Escolha uma receita, informe quantas quer produzir e confirme.
          </p>
        </div>
        {lastBatch && (
          <Button
            variant="secondary"
            disabled={produce.isPending}
            onClick={() => run(lastBatch.recipe_id, Number(lastBatch.batches))}
          >
            <Repeat className="mr-2 size-4" />
            Produzir novamente ({lastBatch.recipe?.name ?? "última"} ×{" "}
            {formatNumber(lastBatch.batches)})
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : activeRecipes.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhuma receita ativa cadastrada.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeRecipes.map((recipe) => {
            const available = availableByRecipe.get(recipe.id) ?? 0;
            const profit = Number(recipe.sale_price ?? 0) - Number(recipe.cost_per_unit ?? 0);
            return (
              <Card key={recipe.id} className="overflow-hidden">
                <div className="flex h-36 items-center justify-center bg-muted">
                  {recipe.image_url ? (
                    <img
                      src={recipe.image_url}
                      alt={`Foto da receita ${recipe.name}`}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <Package className="size-10 text-muted-foreground" />
                  )}
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span className="truncate">{recipe.name}</span>
                    <Badge variant={available > 0 ? "secondary" : "outline"}>
                      {formatNumber(available)} un
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">Custo/garrafinha</p>
                      <p className="font-medium">{formatCurrency(recipe.cost_per_unit)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Lucro/un</p>
                      <p className="font-medium text-primary">{formatCurrency(profit)}</p>
                    </div>
                  </div>
                  <Button className="w-full" onClick={() => setSelected(recipe)}>
                    Produzir
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" /> Histórico recente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {batches.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma produção registrada ainda.</p>
          ) : (
            batches.map((batch) => (
              <div
                key={batch.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 last:border-none"
              >
                <span className="font-medium">{batch.recipe?.name ?? "Receita"}</span>
                <span className="text-muted-foreground">
                  {formatNumber(batch.produced_quantity)} un ·{" "}
                  {formatCurrency(batch.total_cost)} ·{" "}
                  {new Date(batch.produced_at).toLocaleString("pt-BR")}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <QuickProduceDialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        recipe={selected}
        loading={produce.isPending}
        onConfirm={(quantity) => selected && run(selected.id, quantity)}
      />
    </div>
  );
}
