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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ingredientSchema, parseNumber, type IngredientFormValues } from "@/lib/validations/stock";
import type { Category } from "@/types/product";
import { UNITS, type Ingredient, type IngredientInput, type SupplierRow } from "@/types/stock";

interface IngredientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: Ingredient | null;
  suppliers: SupplierRow[];
  categories: Category[];
  loading?: boolean;
  onSubmit: (input: IngredientInput) => void;
}

const EMPTY: IngredientFormValues = {
  name: "",
  category_id: "",
  supplier_id: "",
  unit: "kg",
  quantity: "0",
  min_stock: "0",
  purchase_price: "0",
  purchase_quantity: "0",
  purchase_value: "0",
  purchase_date: new Date().toISOString().slice(0, 10),
  notes: "",
  is_active: true,
};

export function IngredientDialog({
  open,
  onOpenChange,
  ingredient,
  suppliers,
  categories,
  loading,
  onSubmit,
}: IngredientDialogProps) {
  const form = useForm<IngredientFormValues>({
    resolver: zodResolver(ingredientSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      ingredient
        ? {
            name: ingredient.name,
            category_id: ingredient.category_id ?? "",
            supplier_id: ingredient.supplier_id ?? "",
            unit: ingredient.unit,
            quantity: String(ingredient.quantity ?? 0),
            min_stock: String(ingredient.min_stock ?? 0),
            purchase_price: String(ingredient.purchase_price ?? 0),
            purchase_quantity: String(ingredient.last_purchase_quantity ?? 0),
            purchase_value: String(ingredient.last_purchase_value ?? 0),
            purchase_date: ingredient.last_purchase_at ?? "",
            notes: ingredient.notes ?? "",
            is_active: ingredient.is_active,
          }
        : EMPTY,
    );
  }, [open, ingredient, form]);

  const watchedUnit = form.watch("unit");
  const purchaseQuantity = parseNumber(form.watch("purchase_quantity") || "0");
  const purchaseValue = parseNumber(form.watch("purchase_value") || "0");
  const manualPrice = parseNumber(form.watch("purchase_price") || "0");

  const unitPrice =
    purchaseQuantity > 0 && purchaseValue > 0 ? purchaseValue / purchaseQuantity : manualPrice;
  const baseUnit = baseUnitOf(watchedUnit);
  const costPerBase = unitPrice / (toBaseQty(1, watchedUnit, baseUnit) || 1);
  const costTable = unitCostTable(costPerBase, baseUnit);

  const submit = form.handleSubmit((parsed) => {
    const qty = parseNumber(parsed.purchase_quantity);
    const value = parseNumber(parsed.purchase_value);
    const price = qty > 0 && value > 0 ? value / qty : parseNumber(parsed.purchase_price);
    onSubmit({
      name: parsed.name,
      category_id: parsed.category_id ? parsed.category_id : null,
      supplier_id: parsed.supplier_id ? parsed.supplier_id : null,
      unit: parsed.unit,
      quantity: parseNumber(parsed.quantity),
      min_stock: parseNumber(parsed.min_stock),
      purchase_price: price,
      last_purchase_quantity: qty > 0 ? qty : null,
      last_purchase_value: value > 0 ? value : null,
      last_purchase_at: parsed.purchase_date ? parsed.purchase_date : null,
      notes: parsed.notes ? parsed.notes : null,
      is_active: parsed.is_active,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ingredient ? "Editar ingrediente" : "Novo ingrediente"}</DialogTitle>
          <DialogDescription>
            Cadastre o insumo, o fornecedor e o estoque mínimo para receber alertas.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Polpa de açaí" {...field} />
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
                  <Select
                    value={field.value || "nenhuma"}
                    onValueChange={(value) => field.onChange(value === "nenhuma" ? "" : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="nenhuma">Sem categoria</SelectItem>
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
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fornecedor</FormLabel>
                  <Select
                    value={field.value || "nenhum"}
                    onValueChange={(value) => field.onChange(value === "nenhum" ? "" : value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="nenhum">Sem fornecedor</SelectItem>
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
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
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
              name="min_stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estoque mínimo</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchase_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço de compra (R$)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border/60 p-3 sm:col-span-2">
                  <FormLabel className="mb-0">Ingrediente ativo</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
