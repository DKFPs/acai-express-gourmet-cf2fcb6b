import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { formatCurrency } from "@/lib/format";
import { produceSchema, type ProduceFormValues } from "@/lib/validations/production";
import { parseNumber } from "@/lib/validations/stock";
import type { PackagingRow, ProduceInput, Recipe } from "@/types/production";

interface ProduceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: Recipe[];
  packaging: PackagingRow[];
  defaultRecipeId?: string | null;
  loading?: boolean;
  onSubmit: (input: ProduceInput) => void;
}

function nowLocal() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function ProduceDialog({
  open,
  onOpenChange,
  recipes,
  packaging,
  defaultRecipeId,
  loading,
  onSubmit,
}: ProduceDialogProps) {
  const form = useForm<ProduceFormValues>({
    resolver: zodResolver(produceSchema),
    defaultValues: { recipe_id: "", batches: "1", produced_at: nowLocal(), notes: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      recipe_id: defaultRecipeId ?? "",
      batches: "1",
      produced_at: nowLocal(),
      notes: "",
    });
  }, [open, defaultRecipeId, form]);

  const recipeId = form.watch("recipe_id");
  const batches = parseNumber(form.watch("batches") || "0");
  const recipe = recipes.find((item) => item.id === recipeId) ?? null;

  const preview = useMemo(() => {
    if (!recipe || !Number.isFinite(batches) || batches <= 0) return null;
    const produced = Number(recipe.yield_quantity) * batches;
    const ingredients = recipe.items.map((item) => {
      const needed = Number(item.quantity) * batches;
      const available = Number(item.ingredient?.purchase_price ?? 0);
      return {
        id: item.id,
        name: item.ingredient?.name ?? "Ingrediente",
        needed,
        unit: item.unit,
        cost: needed * available,
      };
    });
    const packs = packaging
      .filter((item) => item.is_active && item.type !== "outro")
      .map((item) => ({
        id: item.id,
        name: item.name,
        needed: produced,
        unit: item.unit,
        cost: produced * Number(item.unit_cost),
        missing: Number(item.quantity) < produced,
      }));
    const total =
      ingredients.reduce((sum, item) => sum + item.cost, 0) +
      packs.reduce((sum, item) => sum + item.cost, 0);
    return { produced, ingredients, packs, total };
  }, [recipe, batches, packaging]);

  const submit = form.handleSubmit((values) => {
    onSubmit({
      recipe_id: values.recipe_id,
      batches: parseNumber(values.batches),
      produced_at: new Date(values.produced_at).toISOString(),
      notes: values.notes ? values.notes : null,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Produzir lote</DialogTitle>
          <DialogDescription>
            Os ingredientes e as embalagens são baixados automaticamente do estoque.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <FormField
              control={form.control}
              name="recipe_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receita</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a receita" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {recipes
                        .filter((item) => item.status === "ativo")
                        .map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="batches"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade de lotes</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="produced_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data da produção</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Notas do lote" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {preview ? (
              <div className="space-y-2 rounded-2xl border border-border/60 p-4 text-sm">
                <p className="font-medium">
                  Produzirá {preview.produced} garrafinhas · custo estimado{" "}
                  {formatCurrency(preview.total)}
                </p>
                <ul className="space-y-1 text-muted-foreground">
                  {preview.ingredients.map((item) => (
                    <li key={item.id}>
                      {item.name}: {item.needed} {item.unit}
                    </li>
                  ))}
                  {preview.packs.map((item) => (
                    <li key={item.id} className={item.missing ? "text-destructive" : undefined}>
                      {item.name}: {item.needed} {item.unit}
                      {item.missing ? " (estoque insuficiente)" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Produzindo..." : "Confirmar produção"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
