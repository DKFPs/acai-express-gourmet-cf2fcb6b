import { useEffect, useMemo } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";


import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  RecipeCostSummary,
  RecipeCostTable,
} from "@/components/production/recipe-cost-live";
import { useRecipeCosting } from "@/hooks/use-costing";
import { compatibleUnits } from "@/lib/units";
import { recipeSchema, type RecipeFormValues } from "@/lib/validations/production";
import { parseNumber } from "@/lib/validations/stock";
import type { Recipe, RecipeInput } from "@/types/production";
import type { Ingredient } from "@/types/stock";


interface RecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  ingredients: Ingredient[];
  categories: { id: string; name: string }[];
  loading?: boolean;
  onSubmit: (input: RecipeInput) => void;
}

const EMPTY: RecipeFormValues = {
  name: "",
  category_id: "",
  description: "",
  bottle_volume_ml: "300",
  yield_quantity: "10",
  prep_time_minutes: "30",
  status: "ativo",
  sale_price: "0",
  target_margin_percent: "40",
  shelf_life_days: "5",
  items: [{ ingredient_id: "", quantity: "1", unit: "kg", notes: "" }],
};

export function RecipeDialog({
  open,
  onOpenChange,
  recipe,
  ingredients,
  categories,
  loading,
  onSubmit,
}: RecipeDialogProps) {
  const form = useForm<RecipeFormValues>({
    resolver: zodResolver(recipeSchema),
    defaultValues: EMPTY,
  });

  const items = useFieldArray({ control: form.control, name: "items" });

  const watchedItems = form.watch("items");
  const watchedYield = form.watch("yield_quantity");
  const watchedPrice = form.watch("sale_price");
  const watchedMargin = form.watch("target_margin_percent");

  const costingItems = useMemo(
    () =>
      (watchedItems ?? [])
        .filter((item) => item.ingredient_id)
        .map((item) => ({
          ingredientId: item.ingredient_id,
          quantity: parseNumber(item.quantity || "0"),
          unit: item.unit,
        })),
    [watchedItems],
  );

  const costing = useRecipeCosting({
    items: costingItems,
    yieldQuantity: parseNumber(watchedYield || "0"),
    salePrice: parseNumber(watchedPrice || "0"),
    targetMarginPercent: parseNumber(watchedMargin || "0"),
    salesTaxPercent: Number(recipe?.sales_tax_percent ?? 0),
  });


  useEffect(() => {
    if (!open) return;
    if (recipe) {
      form.reset({
        name: recipe.name,
        category_id: recipe.category_id ?? "",
        description: recipe.description ?? "",
        bottle_volume_ml: String(recipe.bottle_volume_ml ?? 300),
        yield_quantity: String(recipe.yield_quantity ?? 1),
        prep_time_minutes: String(recipe.prep_time_minutes ?? 0),
        status: recipe.status,
        sale_price: String(recipe.sale_price ?? 0),
        target_margin_percent: String(recipe.target_margin_percent ?? 40),
        shelf_life_days: String(recipe.shelf_life_days ?? 5),
        items:
          recipe.items.length > 0
            ? [...recipe.items]
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((item) => ({
                  ingredient_id: item.ingredient_id,
                  quantity: String(item.quantity),
                  unit: item.unit,
                  notes: item.notes ?? "",
                }))
            : EMPTY.items,
      });
    } else {
      form.reset(EMPTY);
    }
  }, [open, recipe, form]);

  const submit = form.handleSubmit((values) => {
    onSubmit({
      name: values.name,
      category_id: values.category_id ? values.category_id : null,
      description: values.description ? values.description : null,
      bottle_volume_ml: parseNumber(values.bottle_volume_ml),
      yield_quantity: parseNumber(values.yield_quantity),
      prep_time_minutes: Math.round(parseNumber(values.prep_time_minutes)),
      status: values.status,
      sale_price: parseNumber(values.sale_price),
      target_margin_percent: parseNumber(values.target_margin_percent),
      shelf_life_days: Math.round(parseNumber(values.shelf_life_days)),
      items: values.items.map((item) => ({
        ingredient_id: item.ingredient_id,
        quantity: parseNumber(item.quantity),
        unit: item.unit,
        notes: item.notes ? item.notes : null,
      })),
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{recipe ? "Editar receita" : "Nova receita"}</DialogTitle>
          <DialogDescription>
            Defina os ingredientes, o rendimento por lote e o volume da garrafinha.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da receita</FormLabel>
                    <FormControl>
                      <Input placeholder="Açaí tradicional 300ml" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="sale_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de venda (un)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="target_margin_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Margem alvo (%)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="shelf_life_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validade (dias)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <FormField
                control={form.control}
                name="bottle_volume_ml"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Volume (ml)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="yield_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rendimento (un)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prep_time_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preparo (min)</FormLabel>
                    <FormControl>
                      <Input inputMode="numeric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ativo">Ativa</SelectItem>
                        <SelectItem value="inativo">Inativa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modo de preparo</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Passo a passo do preparo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-2xl border border-border/60 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Ingredientes</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    items.append({ ingredient_id: "", quantity: "1", unit: "kg", notes: "" })
                  }
                >
                  <Plus className="mr-2 size-4" /> Adicionar
                </Button>
              </div>

              {items.fields.map((fieldItem, index) => (
                <div key={fieldItem.id} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                  <FormField
                    control={form.control}
                    name={`items.${index}.ingredient_id`}
                    render={({ field }) => (
                      <FormItem>
                        <Select
                          value={field.value}
                          onValueChange={(value) => {
                            field.onChange(value);
                            const ingredient = ingredients.find((item) => item.id === value);
                            if (ingredient) {
                              form.setValue(`items.${index}.unit`, ingredient.unit);
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Ingrediente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ingredients.map((ingredient) => (
                              <SelectItem key={ingredient.id} value={ingredient.id}>
                                {ingredient.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input inputMode="decimal" placeholder="Qtd" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unit`}
                    render={({ field }) => {
                      const selected = ingredients.find(
                        (entry) => entry.id === watchedItems?.[index]?.ingredient_id,
                      );
                      const options = compatibleUnits(selected?.unit ?? field.value);
                      return (
                        <FormItem>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Un." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => items.remove(index)}
                    disabled={items.fields.length === 1}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {form.formState.errors.items?.message ? (
                <p className="text-sm text-destructive">{form.formState.errors.items.message}</p>
              ) : null}
            </div>

            <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
              <RecipeCostTable costing={costing} />
              <RecipeCostSummary costing={costing} />
            </div>


            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar receita"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
