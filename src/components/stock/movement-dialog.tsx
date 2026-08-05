import { useEffect } from "react";
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
  FormDescription,
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
import { parseNumber, movementSchema, type MovementFormValues } from "@/lib/validations/stock";
import { MOVEMENT_LABELS, type Ingredient, type MovementInput } from "@/types/stock";

interface MovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredients: Ingredient[];
  defaultIngredientId?: string | null;
  loading?: boolean;
  onSubmit: (input: MovementInput) => void;
}

export function MovementDialog({
  open,
  onOpenChange,
  ingredients,
  defaultIngredientId,
  loading,
  onSubmit,
}: MovementDialogProps) {
  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      ingredient_id: "",
      type: "entrada",
      quantity: "0",
      unit_cost: "0",
      reason: "",
    },
  });

  const selectedId = form.watch("ingredient_id");
  const selected = ingredients.find((item) => item.id === selectedId) ?? null;
  const type = form.watch("type");

  useEffect(() => {
    if (!open) return;
    form.reset({
      ingredient_id: defaultIngredientId ?? "",
      type: "entrada",
      quantity: "0",
      unit_cost: "0",
      reason: "",
    });
  }, [open, defaultIngredientId, form]);

  useEffect(() => {
    if (selected) form.setValue("unit_cost", String(selected.purchase_price ?? 0));
  }, [selected, form]);

  const submit = form.handleSubmit((parsed) => {
    onSubmit({
      ingredient_id: parsed.ingredient_id,
      type: parsed.type,
      quantity: parseNumber(parsed.quantity),
      unit_cost: parseNumber(parsed.unit_cost),
      reason: parsed.reason ? parsed.reason : null,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
          <DialogDescription>
            Entrada soma ao estoque, saída subtrai e ajuste define o saldo exato.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <FormField
              control={form.control}
              name="ingredient_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ingrediente</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ingrediente" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ingredients.map((ingredient) => (
                        <SelectItem key={ingredient.id} value={ingredient.id}>
                          {ingredient.name} ({ingredient.unit})
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(["entrada", "saida", "ajuste"] as const).map((option) => (
                        <SelectItem key={option} value={option}>
                          {MOVEMENT_LABELS[option]}
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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {type === "ajuste" ? "Novo saldo" : "Quantidade"}
                      {selected ? ` (${selected.unit})` : ""}
                    </FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    {selected ? (
                      <FormDescription>Saldo atual: {Number(selected.quantity)}</FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo unitário (R$)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <FormControl>
                    <Input placeholder="Compra, perda, contagem..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Registrando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
