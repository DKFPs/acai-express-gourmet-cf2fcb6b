import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .optional()
    .or(z.literal(""));

export const orderItemSchema = z.object({
  product_id: z.string().uuid().nullable(),
  product_name: z.string().trim().min(1, "Informe o produto").max(120),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantidade inválida" })
    .positive("Quantidade deve ser maior que zero")
    .max(9999),
  unit_price: z.coerce
    .number({ invalid_type_error: "Preço inválido" })
    .min(0, "Preço não pode ser negativo"),
  notes: optionalText(200).nullable().optional(),
});

export const orderSchema = z
  .object({
    customer_id: z.string().uuid().nullable(),
    customer_name: z.string().trim().min(2, "Informe o cliente").max(120),
    customer_phone: optionalText(30),
    delivery_address: optionalText(240),
    payment_method: z.enum(["dinheiro", "pix", "cartao_credito", "cartao_debito", "outro"]),
    payment_status: z.enum(["pendente", "pago", "estornado"]),
    notes: optionalText(500),
    delivery_fee: z.coerce.number().min(0, "Taxa inválida").max(9999),
    discount: z.coerce.number().min(0, "Desconto inválido").max(999999),
    items: z.array(orderItemSchema).min(1, "Adicione ao menos um produto"),
  })
  .refine(
    (data) => {
      const subtotal = data.items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
      return data.discount <= subtotal + data.delivery_fee;
    },
    { message: "Desconto maior que o valor do pedido", path: ["discount"] },
  );

export type OrderFormValues = z.infer<typeof orderSchema>;

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  phone: optionalText(30),
  email: z.string().trim().email("E-mail inválido").max(255).optional().or(z.literal("")),
  address: optionalText(240),
  notes: optionalText(500),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
