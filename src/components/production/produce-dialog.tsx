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
import {
  RecipeCostSummary,
  RecipeCostTable,
} from "@/components/production/recipe-cost-live";
import { useSavedRecipeCosting } from "@/hooks/use-costing";
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

  const costing = useSavedRecipeCosting(recipe, batches > 0 ? batches : 1);
  const preview = recipe && batches > 0 ? costing : null;
  const blocked = Boolean(preview && !preview.validation.ok);


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
              <div className="space-y-3">
                <RecipeCostSummary costing={preview} />
                <RecipeCostTable costing={preview} />
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || blocked}>
                {loading ? "Produzindo..." : "Confirmar produção"}
              </Button>
            </DialogFooter>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
