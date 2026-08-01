import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Minus, Plus, Trash2, UserPlus } from "lucide-react";

import { CustomerFormDialog } from "@/components/orders/customer-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useCustomers, useOrderMutations } from "@/hooks/use-orders";
import { useProducts } from "@/hooks/use-products";
import { formatCurrency } from "@/lib/format";
import { orderSchema, type OrderFormValues } from "@/lib/validations/order";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, type PaymentMethod, type PaymentStatus } from "@/types/order";

export const Route = createFileRoute("/_authenticated/pedidos/novo")({
  head: () => ({
    meta: [
      { title: "Novo pedido — Açaí Express Manager" },
      {
        name: "description",
        content: "Monte um novo pedido: cliente, produtos, taxa de entrega, desconto e pagamento.",
      },
      { property: "og:title", content: "Novo pedido — Açaí Express Manager" },
      {
        property: "og:description",
        content: "Registre pedidos com cálculo automático de total, desconto e entrega.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NovoPedidoPage,
});

const DEFAULT_VALUES: OrderFormValues = {
  customer_id: null,
  customer_name: "",
  customer_phone: "",
  delivery_address: "",
  payment_method: "dinheiro",
  payment_status: "pendente",
  notes: "",
  delivery_fee: 0,
  discount: 0,
  items: [],
};

function NovoPedidoPage() {
  const navigate = useNavigate();
  const { data: customers = [] } = useCustomers();
  const { data: productsData, isLoading: loadingProducts } = useProducts({
    search: "",
    categoryId: "todas",
    status: "ativo",
    stock: "todos",
    page: 1,
    pageSize: 100,
  });
  const { create } = useOrderMutations();
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState<string>("");

  const products = productsData?.items ?? [];

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const deliveryFee = Number(form.watch("delivery_fee")) || 0;
  const discount = Number(form.watch("discount")) || 0;

  const subtotal = useMemo(
    () =>
      (watchedItems ?? []).reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
        0,
      ),
    [watchedItems],
  );
  const total = Math.max(subtotal + deliveryFee - discount, 0);

  const handleSelectCustomer = (value: string) => {
    if (value === "avulso") {
      form.setValue("customer_id", null);
      return;
    }
    const customer = customers.find((item) => item.id === value);
    if (!customer) return;
    form.setValue("customer_id", customer.id);
    form.setValue("customer_name", customer.name);
    form.setValue("customer_phone", customer.phone ?? "");
    form.setValue("delivery_address", customer.address ?? "");
  };

  const handleAddProduct = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    const price = Number(product.promo_price ?? 0) > 0 ? Number(product.promo_price) : Number(product.price);
    const existingIndex = (watchedItems ?? []).findIndex(
      (item) => item?.product_id === product.id,
    );
    if (existingIndex >= 0) {
      const current = Number(watchedItems?.[existingIndex]?.quantity) || 0;
      form.setValue(`items.${existingIndex}.quantity`, current + 1, { shouldDirty: true });
    } else {
      append({
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: price,
        notes: "",
      });
    }
    setProductToAdd("");
  };

  const changeQuantity = (index: number, delta: number) => {
    const current = Number(watchedItems?.[index]?.quantity) || 0;
    form.setValue(`items.${index}.quantity`, Math.max(current + delta, 1), { shouldDirty: true });
  };

  const onSubmit = async (values: OrderFormValues) => {
    try {
      const orderId = await create.mutateAsync({
        customer_id: values.customer_id,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone || null,
        delivery_address: values.delivery_address || null,
        payment_method: values.payment_method,
        payment_status: values.payment_status,
        notes: values.notes || null,
        delivery_fee: values.delivery_fee,
        discount: values.discount,
        items: values.items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes || null,
        })),
      });
      void navigate({ to: "/pedidos/$orderId", params: { orderId } });
    } catch {
      /* toast tratado no hook */
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 -ml-2 text-muted-foreground"
            onClick={() => void navigate({ to: "/pedidos" })}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Novo pedido</h1>
          <p className="text-sm text-muted-foreground">
            Selecione o cliente, adicione produtos e finalize o pagamento.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <Card className="rounded-2xl border-border/60 bg-card/70 shadow-soft">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Cliente</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomerDialogOpen(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Novo cliente
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Cliente cadastrado</Label>
                  <Select
                    value={form.watch("customer_id") ?? "avulso"}
                    onValueChange={handleSelectCustomer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avulso">Cliente avulso</SelectItem>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do cliente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="customer_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input placeholder="(00) 00000-0000" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="delivery_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço de entrega</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, número, bairro" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/60 bg-card/70 shadow-soft">
              <CardHeader>
                <CardTitle className="text-base">Produtos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Adicionar produto</Label>
                  <Select value={productToAdd} onValueChange={handleAddProduct}>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={loadingProducts ? "Carregando produtos..." : "Selecionar produto"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} —{" "}
                          {formatCurrency(
                            Number(product.promo_price ?? 0) > 0 ? product.promo_price : product.price,
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {fields.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                    Nenhum produto adicionado ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {fields.map((field, index) => {
                      const item = watchedItems?.[index];
                      const lineTotal =
                        (Number(item?.quantity) || 0) * (Number(item?.unit_price) || 0);
                      return (
                        <div
                          key={field.id}
                          className="animate-fade-in space-y-3 rounded-xl border border-border/60 bg-background/40 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">{item?.product_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(item?.unit_price)} un.
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => changeQuantity(index, -1)}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </Button>
                              <span className="w-8 text-center text-sm font-semibold">
                                {item?.quantity}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => changeQuantity(index, 1)}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <FormField
                            control={form.control}
                            name={`items.${index}.notes`}
                            render={({ field: notesField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="Observação do item (ex: sem granola)"
                                    {...notesField}
                                    value={notesField.value ?? ""}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <p className="text-right text-sm font-semibold">
                            {formatCurrency(lineTotal)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
                {form.formState.errors.items?.message ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.items.message as string}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit rounded-2xl border-border/60 bg-card/70 shadow-soft lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="text-base">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="delivery_fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxa de entrega</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desconto</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Forma de pagamento</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                          <SelectItem key={method} value={method}>
                            {PAYMENT_METHOD_LABELS[method]}
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
                name="payment_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Situação do pagamento</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((status) => (
                          <SelectItem key={status} value={status}>
                            {PAYMENT_STATUS_LABELS[status]}
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações do pedido</FormLabel>
                    <FormControl>
                      <Textarea rows={3} {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatCurrency(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Entrega</dt>
                  <dd>{formatCurrency(deliveryFee)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Desconto</dt>
                  <dd className="text-destructive">- {formatCurrency(discount)}</dd>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="text-gold">{formatCurrency(total)}</dd>
                </div>
              </dl>

              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Salvando..." : "Finalizar pedido"}
              </Button>
            </CardContent>
          </Card>
        </form>
      </Form>

      <CustomerFormDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onCreated={(customer) => handleSelectCustomer(customer.id)}
      />
    </div>
  );
}
