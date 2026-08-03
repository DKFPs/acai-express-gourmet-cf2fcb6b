import { z } from "zod";

import { parseNumber } from "@/lib/validations/stock";

const numeric = z
  .string()
  .trim()
  .min(1, "Informe um valor")
  .refine((value) => !Number.isNaN(parseNumber(value)), "Informe um valor válido")
  .refine((value) => parseNumber(value) >= 0, "Não pode ser negativo");

export const purchaseSchema = z.object({
  supplier_id: z.string().optional().or(z.literal("")),
  kind: z.enum(["ingrediente", "embalagem"]),
  item_id: z.string().min(1, "Selecione o produto"),
  category_id: z.string().optional().or(z.literal("")),
  quantity: numeric.refine((value) => parseNumber(value) > 0, "Quantidade deve ser maior que zero"),
  unit: z.string().trim().min(1, "Informe a unidade"),
  total_value: numeric,
  purchase_date: z.string().min(1, "Informe a data"),
  notes: z.string().trim().max(300, "Máximo de 300 caracteres").optional().or(z.literal("")),
});

export type PurchaseFormValues = z.infer<typeof purchaseSchema>;
