import { z } from "zod";

const numeric = z
  .string()
  .trim()
  .transform((value) => Number(value.replace(/\./g, "").replace(",", ".")))
  .pipe(z.number({ invalid_type_error: "Informe um valor válido" }).min(0, "Não pode ser negativo"));

export const ingredientSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120, "Máximo de 120 caracteres"),
  category_id: z.string().optional().or(z.literal("")),
  supplier_id: z.string().optional().or(z.literal("")),
  unit: z.string().trim().min(1, "Selecione a unidade"),
  quantity: numeric,
  min_stock: numeric,
  purchase_price: numeric,
  notes: z.string().trim().max(300, "Máximo de 300 caracteres").optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type IngredientFormValues = z.input<typeof ingredientSchema>;

export const supplierSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120, "Máximo de 120 caracteres"),
  document: z.string().trim().max(30).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

export const movementSchema = z.object({
  ingredient_id: z.string().min(1, "Selecione o ingrediente"),
  type: z.enum(["entrada", "saida", "ajuste"]),
  quantity: numeric,
  unit_cost: numeric,
  reason: z.string().trim().max(200, "Máximo de 200 caracteres").optional().or(z.literal("")),
});

export type MovementFormValues = z.input<typeof movementSchema>;
