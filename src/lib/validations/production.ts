import { z } from "zod";

import { parseNumber } from "@/lib/validations/stock";

const numeric = z
  .string()
  .trim()
  .min(1, "Informe um valor")
  .refine((value) => !Number.isNaN(parseNumber(value)), "Informe um valor válido")
  .refine((value) => parseNumber(value) >= 0, "Não pode ser negativo");

const positive = numeric.refine(
  (value) => parseNumber(value) > 0,
  "Informe um valor maior que zero",
);

export const recipeSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120, "Máximo de 120 caracteres"),
  category_id: z.string().optional().or(z.literal("")),
  description: z.string().trim().max(400, "Máximo de 400 caracteres").optional().or(z.literal("")),
  bottle_volume_ml: positive,
  yield_quantity: positive,
  prep_time_minutes: numeric,
  status: z.enum(["ativo", "inativo"]),
  sale_price: numeric,
  target_margin_percent: numeric,
  shelf_life_days: numeric,
  items: z
    .array(
      z.object({
        ingredient_id: z.string().min(1, "Selecione o ingrediente"),
        quantity: positive,
        unit: z.string().trim().min(1, "Informe a unidade"),
        notes: z.string().trim().max(160).optional().or(z.literal("")),
      }),
    )
    .min(1, "Adicione pelo menos um ingrediente"),
});

export type RecipeFormValues = z.infer<typeof recipeSchema>;

export const packagingSchema = z.object({
  type: z.enum(["garrafa", "tampa", "canudo", "lacre", "etiqueta", "outro"]),
  name: z.string().trim().min(2, "Informe o nome").max(120, "Máximo de 120 caracteres"),
  unit: z.string().trim().min(1, "Informe a unidade"),
  quantity: numeric,
  min_stock: numeric,
  unit_cost: numeric,
  qty_per_unit: numeric,
  purchase_quantity: z.string().optional().or(z.literal("")),
  purchase_value: z.string().optional().or(z.literal("")),
  supplier_id: z.string().optional().or(z.literal("")),
  last_purchase_at: z.string().optional().or(z.literal("")),
  next_restock_at: z.string().optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type PackagingFormValues = z.infer<typeof packagingSchema>;

export const produceSchema = z.object({
  recipe_id: z.string().min(1, "Selecione a receita"),
  batches: positive,
  produced_at: z.string().min(1, "Informe a data"),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export type ProduceFormValues = z.infer<typeof produceSchema>;

export const finishedMovementSchema = z.object({
  finished_product_id: z.string().min(1, "Selecione o produto"),
  type: z.enum(["venda", "descarte", "reserva", "ajuste", "estorno"]),
  quantity: positive,
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export type FinishedMovementFormValues = z.infer<typeof finishedMovementSchema>;
