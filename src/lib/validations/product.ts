import { z } from "zod";

const money = z
  .string()
  .trim()
  .transform((value) => Number(value.replace(/\./g, "").replace(",", ".")))
  .pipe(z.number({ invalid_type_error: "Informe um valor válido" }).min(0, "Não pode ser negativo"));

const optionalMoney = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : Number(value.replace(/\./g, "").replace(",", "."))))
  .pipe(z.number().min(0, "Não pode ser negativo").nullable());

export const productSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome").max(120, "Máximo de 120 caracteres"),
    category_id: z.string().trim().min(1, "Selecione uma categoria"),
    internal_code: z.string().trim().max(40, "Máximo de 40 caracteres").optional().or(z.literal("")),
    description: z.string().trim().max(500, "Máximo de 500 caracteres").optional().or(z.literal("")),
    image_url: z.string().nullable().optional(),
    price: money,
    promo_price: optionalMoney,
    cost: money,
    status: z.enum(["ativo", "inativo"]),
    stock_quantity: money,
    min_stock: money,
  })
  .refine((data) => data.promo_price === null || data.promo_price <= data.price, {
    message: "O preço promocional deve ser menor que o preço",
    path: ["promo_price"],
  });

export type ProductFormValues = z.input<typeof productSchema>;
export type ProductFormOutput = z.output<typeof productSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(60, "Máximo de 60 caracteres"),
  description: z.string().trim().max(200, "Máximo de 200 caracteres").optional().or(z.literal("")),
  color: z.string().trim().max(20).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
