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
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/lib/format";
import { packagingSchema, type PackagingFormValues } from "@/lib/validations/production";
import { parseNumber } from "@/lib/validations/stock";
import {
  PACKAGING_LABELS,
  PACKAGING_TYPES,
  type PackagingInput,
  type PackagingRow,
} from "@/types/production";

interface PackagingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packaging: PackagingRow | null;
  suppliers?: { id: string; name: string }[];
  loading?: boolean;
  onSubmit: (input: PackagingInput) => void;
}

const EMPTY: PackagingFormValues = {
  type: "garrafa",
  name: "",
  unit: "un",
  quantity: "0",
  min_stock: "0",
  unit_cost: "0",
  qty_per_unit: "1",
  purchase_quantity: "",
  purchase_value: "",
  supplier_id: "",
  last_purchase_at: "",
  next_restock_at: "",
  is_active: true,
};

const optionalNumber = (value?: string) => {
  const text = (value ?? "").trim();
  return text ? parseNumber(text) : null;
};

export function PackagingDialog({
  open,
  onOpenChange,
  packaging,
  suppliers = [],
  loading,
  onSubmit,
}: PackagingDialogProps) {
  const form = useForm<PackagingFormValues>({
    resolver: zodResolver(packagingSchema),
    defaultValues: EMPTY,
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      packaging
        ? {
            type: packaging.type,
            name: packaging.name,
            unit: packaging.unit,
            quantity: String(packaging.quantity),
            min_stock: String(packaging.min_stock),
            unit_cost: String(packaging.unit_cost),
            qty_per_unit: String(packaging.qty_per_unit ?? 1),
            purchase_quantity:
              packaging.purchase_quantity === null ? "" : String(packaging.purchase_quantity),
            purchase_value:
              packaging.purchase_value === null ? "" : String(packaging.purchase_value),
            supplier_id: packaging.supplier_id ?? "",
            last_purchase_at: packaging.last_purchase_at ?? "",
            next_restock_at: packaging.next_restock_at ?? "",
            is_active: packaging.is_active,
          }
        : EMPTY,
    );
  }, [open, packaging, form]);

  const purchaseQuantity = parseNumber(form.watch("purchase_quantity") || "0");
  const purchaseValue = parseNumber(form.watch("purchase_value") || "0");
  const qtyPerUnit = parseNumber(form.watch("qty_per_unit") || "0");
  const unitCost = parseNumber(form.watch("unit_cost") || "0");

  const derivedCost = useMemo(
    () => (purchaseQuantity > 0 ? purchaseValue / purchaseQuantity : null),
    [purchaseQuantity, purchaseValue],
  );

  const submit = form.handleSubmit((values) => {
    onSubmit({
      type: values.type,
      name: values.name,
      unit: values.unit,
      quantity: parseNumber(values.quantity),
      min_stock: parseNumber(values.min_stock),
      unit_cost: parseNumber(values.unit_cost),
      qty_per_unit: parseNumber(values.qty_per_unit),
      purchase_quantity: optionalNumber(values.purchase_quantity),
      purchase_value: optionalNumber(values.purchase_value),
      supplier_id: values.supplier_id ? values.supplier_id : null,
      last_purchase_at: values.last_purchase_at ? values.last_purchase_at : null,
      next_restock_at: values.next_restock_at ? values.next_restock_at : null,
      is_active: values.is_active,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{packaging ? "Editar embalagem" : "Nova embalagem"}</DialogTitle>
          <DialogDescription>
            Garrafinhas, tampas, canudos, lacres e etiquetas usados na produção.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
                        {PACKAGING_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {PACKAGING_LABELS[type]}
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Garrafinha 300ml" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="purchase_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade comprada</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="1000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="purchase_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor pago (R$)</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" placeholder="850,00" {...field} />
                    </FormControl>
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
                    {derivedCost !== null ? (
                      <FormDescription>
                        Pela compra: {formatCurrency(derivedCost)} por unidade
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto px-2 py-0"
                          onClick={() =>
                            form.setValue("unit_cost", derivedCost.toFixed(4), {
                              shouldValidate: true,
                            })
                          }
                        >
                          aplicar
                        </Button>
                      </FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Em estoque</FormLabel>
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
                    <FormLabel>Mínimo</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="qty_per_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usada por garrafinha</FormLabel>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fornecedor</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sem fornecedor" />
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
                name="last_purchase_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Última compra</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="next_restock_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Próxima reposição</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
              Custo desta embalagem por garrafinha:{" "}
              <strong>{formatCurrency(unitCost * qtyPerUnit)}</strong>
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                  <FormLabel className="m-0">Ativa na produção</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
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
