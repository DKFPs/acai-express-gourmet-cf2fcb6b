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
import {
  finishedMovementSchema,
  type FinishedMovementFormValues,
} from "@/lib/validations/production";
import { parseNumber } from "@/lib/validations/stock";
import {
  FINISHED_MOVEMENT_LABELS,
  type FinishedMovementInput,
  type FinishedProduct,
} from "@/types/production";

interface FinishedMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: FinishedProduct[];
  defaultProductId?: string | null;
  loading?: boolean;
  onSubmit: (input: FinishedMovementInput) => void;
}

const TYPES = ["venda", "descarte", "reserva", "ajuste", "estorno"] as const;

export function FinishedMovementDialog({
  open,
  onOpenChange,
  products,
  defaultProductId,
  loading,
  onSubmit,
}: FinishedMovementDialogProps) {
  const form = useForm<FinishedMovementFormValues>({
    resolver: zodResolver(finishedMovementSchema),
    defaultValues: { finished_product_id: "", type: "venda", quantity: "1", reason: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      finished_product_id: defaultProductId ?? "",
      type: "venda",
      quantity: "1",
      reason: "",
    });
  }, [open, defaultProductId, form]);

  const selectedId = form.watch("finished_product_id");
  const selected = products.find((item) => item.id === selectedId) ?? null;
  const type = form.watch("type");

  const submit = form.handleSubmit((values) => {
    onSubmit({
      finished_product_id: values.finished_product_id,
      type: values.type,
      quantity: parseNumber(values.quantity),
      reason: values.reason ? values.reason : null,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Movimentar produto pronto</DialogTitle>
          <DialogDescription>
            Registre vendas, descartes, reservas ou ajustes de saldo das garrafinhas prontas.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4">
            <FormField
              control={form.control}
              name="finished_product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto pronto</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o produto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((item) => (
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
                        {TYPES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {FINISHED_MOVEMENT_LABELS[option]}
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
                    <FormLabel>{type === "ajuste" ? "Novo saldo" : "Quantidade"}</FormLabel>
                    <FormControl>
                      <Input inputMode="decimal" {...field} />
                    </FormControl>
                    {selected ? (
                      <FormDescription>
                        Disponível: {Number(selected.quantity_available)}
                      </FormDescription>
                    ) : null}
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
                    <Input placeholder="Venda balcão, validade, contagem..." {...field} />
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
