import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeftRight, FlaskConical, Package, Plus, Search } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { ConfirmDeleteDialog } from "@/components/products/confirm-delete-dialog";
import { FinishedMovementDialog } from "@/components/production/finished-movement-dialog";
import { PackagingDialog } from "@/components/production/packaging-dialog";
import { ProduceDialog } from "@/components/production/produce-dialog";
import { RecipeDialog } from "@/components/production/recipe-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/use-permissions";
import { useCategories } from "@/hooks/use-products";
import {
  useFinishedMovementMutations,
  useFinishedMovements,
  useFinishedProducts,
  usePackaging,
  usePackagingMutations,
  useProduceBatch,
  useProductionBatches,
  useRecipeMutations,
  useRecipes,
} from "@/hooks/use-production";
import { CommercialDashboard } from "@/components/production/commercial-dashboard";
import { BatchLabelsPanel } from "@/components/production/batch-labels-panel";
import { PriceSimulator } from "@/components/production/price-simulator";
import { ProductionAlerts } from "@/components/production/production-alerts";
import { ProductionDashboard } from "@/components/production/production-dashboard";
import { ProductionReports } from "@/components/production/production-reports";
import { RecipeCostsPanel } from "@/components/production/recipe-costs-panel";
import { ValidityPanel } from "@/components/production/validity-panel";
import {
  useBatchLabels,
  useCommercialOverview,
  useProductionOverview,
  useProductionRealtime,
  useProductionValidity,
  useRecipeCostHistory,
} from "@/hooks/use-production-analytics";
import { buildProductionAlerts } from "@/lib/production-alerts";
import { useAllIngredients } from "@/hooks/use-stock";
import { formatCurrency } from "@/lib/format";
import {
  FINISHED_MOVEMENT_LABELS,
  PACKAGING_LABELS,
  type PackagingRow,
  type Recipe,
} from "@/types/production";

export const Route = createFileRoute("/_authenticated/producao")({
  head: () => ({
    meta: [
      { title: "Produção Inteligente — Açaí Express Manager" },
      {
        name: "description",
        content:
          "Receitas, produção de lotes, controle de embalagens e estoque de produtos prontos.",
      },
      { property: "og:title", content: "Produção Inteligente — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Cadastre receitas, produza lotes e acompanhe o estoque de garrafinhas prontas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProducaoPage,
});

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function ProducaoPage() {
  const [search, setSearch] = useState("");
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [produceOpen, setProduceOpen] = useState(false);
  const [produceRecipe, setProduceRecipe] = useState<string | null>(null);
  const [packagingOpen, setPackagingOpen] = useState(false);
  const [editingPackaging, setEditingPackaging] = useState<PackagingRow | null>(null);
  const [packagingToDelete, setPackagingToDelete] = useState<PackagingRow | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementTarget, setMovementTarget] = useState<string | null>(null);

  const { can } = usePermissions();
  const canManage = can("production.manage");

  const { data: recipes = [], isLoading: loadingRecipes } = useRecipes(search);
  const { data: allRecipes = [] } = useRecipes("");
  const { data: ingredients = [] } = useAllIngredients();
  const { data: categories = [] } = useCategories();
  const { data: packaging = [] } = usePackaging();
  const { data: batches = [] } = useProductionBatches(100);
  const { data: finished = [] } = useFinishedProducts();
  const { data: movements = [] } = useFinishedMovements(150);
  const { data: overview } = useProductionOverview(60);
  const { data: commercial } = useCommercialOverview(30);
  const { data: validity = [] } = useProductionValidity(120);
  const { data: costHistory = [] } = useRecipeCostHistory();
  const { data: labels = [] } = useBatchLabels(60);

  useProductionRealtime();

  const recipeMutations = useRecipeMutations();
  const packagingMutations = usePackagingMutations();
  const produce = useProduceBatch();
  const finishedMutations = useFinishedMovementMutations();

  const criticalPackaging = useMemo(
    () => packaging.filter((item) => Number(item.quantity) <= Number(item.min_stock)),
    [packaging],
  );
  const availableTotal = useMemo(
    () => finished.reduce((sum, item) => sum + Number(item.quantity_available), 0),
    [finished],
  );
  const alerts = useMemo(
    () => buildProductionAlerts({ ingredients, packaging, recipes: allRecipes, validity }),
    [ingredients, packaging, allRecipes, validity],
  );
  const producedTotal = useMemo(
    () => batches.reduce((sum, item) => sum + Number(item.produced_quantity), 0),
    [batches],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produção Inteligente"
        description="Receitas, lotes de produção, embalagens e estoque de produtos prontos."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setMovementTarget(null);
                setMovementOpen(true);
              }}
            >
              <ArrowLeftRight className="mr-2 size-4" /> Movimentar prontos
            </Button>
            {canManage ? (
              <Button
                onClick={() => {
                  setProduceRecipe(null);
                  setProduceOpen(true);
                }}
              >
                <FlaskConical className="mr-2 size-4" /> Produzir lote
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Receitas</p>
            <p className="text-2xl font-semibold">{allRecipes.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Prontos disponíveis</p>
            <p className="text-2xl font-semibold">{availableTotal}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Produzido (últimos lotes)</p>
            <p className="text-2xl font-semibold">{producedTotal}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Embalagens críticas</p>
            <p className="text-2xl font-semibold text-destructive">{criticalPackaging.length}</p>
          </CardContent>
        </Card>
      </div>

      {criticalPackaging.length > 0 ? (
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTriangle className="size-4" />
          <AlertTitle>Embalagens em nível crítico</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              {criticalPackaging.map((item) => (
                <Badge key={item.id} variant="destructive">
                  {item.name}: {Number(item.quantity)} {item.unit}
                </Badge>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="painel">
        <TabsList className="flex-wrap">
          <TabsTrigger value="painel">Painel</TabsTrigger>
          <TabsTrigger value="comercial">Comercial</TabsTrigger>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
          <TabsTrigger value="custos">Custos</TabsTrigger>
          <TabsTrigger value="validade">Validade</TabsTrigger>
          <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
          <TabsTrigger value="simulador">Simulador</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
          <TabsTrigger value="lotes">Lotes</TabsTrigger>
          <TabsTrigger value="prontos">Produtos prontos</TabsTrigger>
          <TabsTrigger value="embalagens">Embalagens</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="painel" className="space-y-4 pt-4">
          <ProductionAlerts alerts={alerts} />
          <ProductionDashboard data={overview} />
        </TabsContent>

        <TabsContent value="comercial" className="pt-4">
          <CommercialDashboard data={commercial} />
        </TabsContent>

        <TabsContent value="custos" className="pt-4">
          <RecipeCostsPanel recipes={allRecipes} history={costHistory} />
        </TabsContent>

        <TabsContent value="validade" className="pt-4">
          <ValidityPanel batches={validity} canManage={canManage} />
        </TabsContent>

        <TabsContent value="etiquetas" className="pt-4">
          <BatchLabelsPanel labels={labels} />
        </TabsContent>

        <TabsContent value="simulador" className="pt-4">
          <PriceSimulator recipes={allRecipes} />
        </TabsContent>

        <TabsContent value="relatorios" className="pt-4">
          <ProductionReports
            overview={overview}
            commercial={commercial}
            validity={validity}
            recipes={allRecipes}
            history={costHistory}
          />
        </TabsContent>

        <TabsContent value="receitas" className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Pesquisar receita"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            {canManage ? (
              <Button
                onClick={() => {
                  setEditingRecipe(null);
                  setRecipeOpen(true);
                }}
              >
                <Plus className="mr-2 size-4" /> Nova receita
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recipes.map((recipe) => (
              <Card key={recipe.id} className="rounded-2xl">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{recipe.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(recipe.bottle_volume_ml)} ml · rende {Number(recipe.yield_quantity)}{" "}
                        un · {recipe.prep_time_minutes} min
                      </p>
                    </div>
                    <Badge variant={recipe.status === "ativo" ? "secondary" : "outline"}>
                      {recipe.status === "ativo" ? "Ativa" : "Inativa"}
                    </Badge>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {recipe.items.slice(0, 4).map((item) => (
                      <li key={item.id}>
                        {item.ingredient?.name ?? "Ingrediente"} — {Number(item.quantity)}{" "}
                        {item.unit}
                      </li>
                    ))}
                    {recipe.items.length > 4 ? (
                      <li>+{recipe.items.length - 4} ingredientes</li>
                    ) : null}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    {canManage ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => {
                            setProduceRecipe(recipe.id);
                            setProduceOpen(true);
                          }}
                        >
                          Produzir
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingRecipe(recipe);
                            setRecipeOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => setRecipeToDelete(recipe)}
                        >
                          Excluir
                        </Button>
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!loadingRecipes && recipes.length === 0 ? (
              <p className="py-10 text-center text-muted-foreground">Nenhuma receita cadastrada.</p>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="lotes" className="pt-4">
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Lotes</TableHead>
                  <TableHead>Produzido</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell>{formatDateTime(batch.produced_at)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      <Link
                        to="/lote/$batchId"
                        params={{ batchId: batch.id }}
                        className="text-primary hover:underline"
                      >
                        {batch.batch_code ?? batch.id.slice(0, 8)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{batch.recipe?.name ?? "—"}</TableCell>
                    <TableCell>
                      {batch.expires_at
                        ? new Date(`${batch.expires_at}T00:00:00`).toLocaleDateString("pt-BR")
                        : "—"}
                    </TableCell>
                    <TableCell>{Number(batch.batches)}</TableCell>
                    <TableCell>{Number(batch.produced_quantity)} un</TableCell>
                    <TableCell className="text-muted-foreground">
                      {batch.responsible_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(Number(batch.total_cost))}
                    </TableCell>
                  </TableRow>
                ))}
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      Nenhum lote produzido ainda.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="prontos" className="pt-4">
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Disponível</TableHead>
                  <TableHead>Produzido</TableHead>
                  <TableHead>Vendido</TableHead>
                  <TableHead>Descartado</TableHead>
                  <TableHead>Reservado</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {finished.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{Number(item.quantity_available)}</TableCell>
                    <TableCell>{Number(item.quantity_produced)}</TableCell>
                    <TableCell>{Number(item.quantity_sold)}</TableCell>
                    <TableCell>{Number(item.quantity_discarded)}</TableCell>
                    <TableCell>{Number(item.quantity_reserved)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setMovementTarget(item.id);
                          setMovementOpen(true);
                        }}
                      >
                        Movimentar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {finished.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Nenhum produto pronto em estoque.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="embalagens" className="space-y-4 pt-4">
          {canManage ? (
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  setEditingPackaging(null);
                  setPackagingOpen(true);
                }}
              >
                <Package className="mr-2 size-4" /> Nova embalagem
              </Button>
            </div>
          ) : null}
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Mínimo</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {packaging.map((item) => {
                  const critical = Number(item.quantity) <= Number(item.min_stock);
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.name}
                        {!item.is_active ? (
                          <Badge variant="secondary" className="ml-2">
                            inativa
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{PACKAGING_LABELS[item.type]}</TableCell>
                      <TableCell className={critical ? "text-destructive" : undefined}>
                        {Number(item.quantity)} {item.unit}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {Number(item.min_stock)}
                      </TableCell>
                      <TableCell>{formatCurrency(Number(item.unit_cost))}</TableCell>
                      <TableCell className="text-right">
                        {canManage ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingPackaging(item);
                                setPackagingOpen(true);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => setPackagingToDelete(item)}
                            >
                              Excluir
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {packaging.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Nenhuma embalagem cadastrada.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="historico" className="pt-4">
          <div className="overflow-hidden rounded-2xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDateTime(movement.created_at)}</TableCell>
                    <TableCell className="font-medium">
                      {movement.finished_product?.name ?? "—"}
                    </TableCell>
                    <TableCell>{FINISHED_MOVEMENT_LABELS[movement.type]}</TableCell>
                    <TableCell>{Number(movement.quantity)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {movement.reason ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Nenhuma movimentação registrada.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <RecipeDialog
        open={recipeOpen}
        onOpenChange={setRecipeOpen}
        recipe={editingRecipe}
        ingredients={ingredients}
        categories={categories}
        loading={recipeMutations.create.isPending || recipeMutations.update.isPending}
        onSubmit={(input) => {
          if (editingRecipe) {
            recipeMutations.update.mutate(
              { id: editingRecipe.id, input },
              { onSuccess: () => setRecipeOpen(false) },
            );
          } else {
            recipeMutations.create.mutate(input, { onSuccess: () => setRecipeOpen(false) });
          }
        }}
      />

      <ProduceDialog
        open={produceOpen}
        onOpenChange={setProduceOpen}
        recipes={allRecipes}
        packaging={packaging}
        defaultRecipeId={produceRecipe}
        loading={produce.isPending}
        onSubmit={(input) => produce.mutate(input, { onSuccess: () => setProduceOpen(false) })}
      />

      <PackagingDialog
        open={packagingOpen}
        onOpenChange={setPackagingOpen}
        packaging={editingPackaging}
        loading={packagingMutations.create.isPending || packagingMutations.update.isPending}
        onSubmit={(input) => {
          if (editingPackaging) {
            packagingMutations.update.mutate(
              { id: editingPackaging.id, input },
              { onSuccess: () => setPackagingOpen(false) },
            );
          } else {
            packagingMutations.create.mutate(input, {
              onSuccess: () => setPackagingOpen(false),
            });
          }
        }}
      />

      <FinishedMovementDialog
        open={movementOpen}
        onOpenChange={setMovementOpen}
        products={finished}
        defaultProductId={movementTarget}
        loading={finishedMutations.create.isPending}
        onSubmit={(input) =>
          finishedMutations.create.mutate(input, { onSuccess: () => setMovementOpen(false) })
        }
      />

      <ConfirmDeleteDialog
        open={Boolean(recipeToDelete)}
        onOpenChange={(open) => !open && setRecipeToDelete(null)}
        title="Excluir receita"
        description={`A receita "${recipeToDelete?.name ?? ""}" será removida permanentemente.`}
        loading={recipeMutations.remove.isPending}
        onConfirm={() => {
          if (!recipeToDelete) return;
          recipeMutations.remove.mutate(recipeToDelete.id, {
            onSuccess: () => setRecipeToDelete(null),
          });
        }}
      />

      <ConfirmDeleteDialog
        open={Boolean(packagingToDelete)}
        onOpenChange={(open) => !open && setPackagingToDelete(null)}
        title="Excluir embalagem"
        description={`A embalagem "${packagingToDelete?.name ?? ""}" será removida permanentemente.`}
        loading={packagingMutations.remove.isPending}
        onConfirm={() => {
          if (!packagingToDelete) return;
          packagingMutations.remove.mutate(packagingToDelete.id, {
            onSuccess: () => setPackagingToDelete(null),
          });
        }}
      />
    </div>
  );
}
