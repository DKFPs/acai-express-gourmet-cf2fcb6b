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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { purchaseSchema, type PurchaseFormValues } from "@/lib/validations/purchase";
import { parseNumber } from "@/lib/validations/stock";
import type { Ingredient, SupplierRow } from "@/types/stock";
import type { PackagingRow } from "@/types/production";
import type { PurchaseInput } from "@/types/purchase";

export interface PurchaseDialogDefaults {
  supplier_id: string;
  kind: "ingrediente" | "embalagem";
  item_id: string;
  category_id: string;
  quantity: string;
  unit: string;
  total_value: string;
  notes: string;
}

interface PurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: SupplierRow[];
  ingredients: Ingredient[];
  packaging: PackagingRow[];
  categories: { id: string; name: string }[];
  defaults?: PurchaseDialogDefaults | null;
  loading?: boolean;
  onSubmit: (input: PurchaseInput) => void;
}

const today = () => new Date().toISOString().slice(0, 10);

export function PurchaseDialog({
  open,
  onOpenChange,
  suppliers,
  ingredients,
  packaging,
  categories,
  defaults,
  loading,
  onSubmit,
}: PurchaseDialogProps) {
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      supplier_id: "",
      kind: "ingrediente",
      item_id: "",
      category_id: "",
      quantity: "1",
      unit: "un",
      total_value: "0",
      purchase_date: today(),
      notes: "",
    },
  });

  const kind = form.watch("kind");
  const itemId = form.watch("item_id");
  const quantity = parseNumber(form.watch("quantity") || "0");
  const total = parseNumber(form.watch("total_value") || "0");

  const options = useMemo(
    () =>
      kind === "ingrediente"
        ? ingredients.map((item) => ({ id: item.id, name: item.name, unit: item.unit }))
        : packaging.map((item) => ({ id: item.id, name: item.name, unit: item.unit })),
    [kind, ingredients, packaging],
  );

  useEffect(() => {
    if (!open) return;
    form.reset({
      supplier_id: defaults?.supplier_id ?? "",
      kind: defaults?.kind ?? "ingrediente",
      item_id: defaults?.item_id ?? "",
      category_id: defaults?.category_id ?? "",
      quantity: defaults?.quantity ?? "1",
      unit: defaults?.unit ?? "un",
      total_value: defaults?.total_value ?? "0",
      purchase_date: today(),
      notes: defaults?.notes ?? "",
    });
  }, [open, defaults, form]);

  useEffect(() => {
    const selected = options.find((option) => option.id === itemId);
    if (selected) form.setValue("unit", selected.unit);
  }, [itemId, options, form]);

  const unitCost = quantity > 0 ? total / quantity : 0;

  const submit = form.handleSubmit((values) => {
    const selected = options.find((option) => option.id === values.item_id);
    const qty = parseNumber(values.quantity);
    const totalValue = parseNumber(values.total_value);
    onSubmit({
      supplier_id: values.supplier_id ? values.supplier_id : null,
      supplier_name: suppliers.find((s) => s.id === values.supplier_id)?.name ?? null,
      kind: values.kind,
      ingredient_id: values.kind === "ingrediente" ? values.item_id : null,
      packaging_id: values.kind === "embalagem" ? values.item_id : null,
      category_id: values.category_id ? values.category_id : null,
      item_name: selected?.name ?? "Item",
      quantity: qty,
      unit: values.unit,
      total_value: totalValue,
      unit_cost: qty > 0 ? totalValue / qty : 0,
      purchase_date: values.purchase_date,
      notes: values.notes ? values.notes : null,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova compra</DialogTitle>
          <DialogDescription>
            Ao salvar, o estoque entra automaticamente, o custo médio é recalculado e as receitas
            são atualizadas.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
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
                name="kind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue("item_id", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ingrediente">Ingrediente</SelectItem>
                        <SelectItem value="embalagem">Embalagem</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="item_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
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
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Opcional" />
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

              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor total</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormDescription>{formatCurrency(unitCost)} por unidade</FormDescription>
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
                  <FormLabel>Observação</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Opcional" {...field} />
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
                Salvar compra
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
