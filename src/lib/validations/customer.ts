import { z } from "zod";

const optionalText = (max: number) =>
  z.string().trim().max(max, `Máximo de ${max} caracteres`).optional().or(z.literal(""));

export const customerFullSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(120),
  phone: optionalText(30),
  whatsapp: optionalText(30),
  email: z.string().trim().email("E-mail inválido").max(255).optional().or(z.literal("")),
  address: optionalText(240),
  city: optionalText(120),
  zip_code: z
    .string()
    .trim()
    .regex(/^\d{5}-?\d{3}$/, "CEP inválido (00000-000)")
    .optional()
    .or(z.literal("")),
  notes: optionalText(500),
  is_active: z.boolean(),
});

export type CustomerFullFormValues = z.infer<typeof customerFullSchema>;
