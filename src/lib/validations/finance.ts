import { z } from "zod";

import { parseNumber } from "@/lib/validations/stock";

const amount = z
  .string()
  .trim()
  .min(1, "Informe o valor")
  .refine((value) => !Number.isNaN(parseNumber(value)), "Informe um valor válido")
  .refine((value) => parseNumber(value) > 0, "O valor deve ser maior que zero");

export const financialEntrySchema = z
  .object({
    type: z.enum(["receita", "despesa", "compra", "investimento"]),
    status: z.enum(["pago", "pendente", "cancelado"]),
    description: z
      .string()
      .trim()
      .min(3, "Informe uma descrição")
      .max(160, "Máximo de 160 caracteres"),
    amount,
    category_id: z.string().optional().or(z.literal("")),
    supplier_id: z.string().optional().or(z.literal("")),
    payment_method: z.string().optional().or(z.literal("")),
    due_date: z.string().min(1, "Informe a data de vencimento"),
    paid_at: z.string().optional().or(z.literal("")),
    notes: z.string().trim().max(400, "Máximo de 400 caracteres").optional().or(z.literal("")),
  })
  .refine((data) => data.status !== "pago" || Boolean(data.paid_at), {
    path: ["paid_at"],
    message: "Informe a data do pagamento",
  });

export type FinancialEntryFormValues = z.infer<typeof financialEntrySchema>;

export const expenseCategorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(80, "Máximo de 80 caracteres"),
  type: z.enum(["receita", "despesa", "compra", "investimento"]),
  color: z.string().trim().max(20).optional().or(z.literal("")),
  description: z.string().trim().max(200).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export type ExpenseCategoryFormValues = z.infer<typeof expenseCategorySchema>;

export const cashRegisterSchema = z.object({
  opening_amount: amount,
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});

export const cashCloseSchema = z.object({
  closing_amount: amount,
  notes: z.string().trim().max(300).optional().or(z.literal("")),
});
