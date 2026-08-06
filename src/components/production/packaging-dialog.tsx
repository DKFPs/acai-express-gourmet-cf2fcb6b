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
  is_active: true,
};

export function PackagingDialog({
  open,
  onOpenChange,
  packaging,
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
            is_active: packaging.is_active,
          }
        : EMPTY,
    );
  }, [open, packaging, form]);

  const submit = form.handleSubmit((values) => {
    onSubmit({
      type: values.type,
      name: values.name,
      unit: values.unit,
      quantity: parseNumber(values.quantity),
      min_stock: parseNumber(values.min_stock),
      unit_cost: parseNumber(values.unit_cost),
      is_active: values.is_active,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
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

            <div className="grid gap-4 sm:grid-cols-4">
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
                name="unit_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo (R$)</FormLabel>
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
